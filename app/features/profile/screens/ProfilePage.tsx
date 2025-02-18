// app/features/profile/screens/ProfilePage.tsx

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ListRenderItem,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { ProfileStackParamList, User } from '@navigation/types';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import Feather from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, layout, shadows } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { optimizeImage } from '../../../utils/imageOptimizer';

interface Photo {
  id: string;
  url: string;
  user_id: string;
  created_at: string;
  caption?: string;
}

interface Post {
  id: string;
  photo_url: string;
  caption?: string;
  created_at: string;
}

type ProfilePageRouteProp = RouteProp<ProfileStackParamList, 'ProfilePage'>;

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 80;
const GALLERY_SPACING = 24;
const GALLERY_COLUMN_WIDTH = (width - GALLERY_SPACING * 3) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Photo>);

const ProfilePage: React.FC = () => {
  const route = useRoute<ProfilePageRouteProp>();
  const navigation = useNavigation();
  const { user: authUser, signOut } = useContext(AuthContext);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const scrollY = new Animated.Value(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [0, -TOTAL_HEADER_HEIGHT],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT / 2, TOTAL_HEADER_HEIGHT],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp'
  });

  const profileScale = scrollY.interpolate({
    inputRange: [-100, 0, TOTAL_HEADER_HEIGHT],
    outputRange: [1.2, 1, 0.8],
    extrapolate: 'clamp'
  });

  const prefetchImages = async (imagesToPrefetch: Photo[]) => {
    try {
      // Create an array of prefetch promises
      const prefetchPromises = imagesToPrefetch.map(post => {
        // Prefetch the image
        const imagePrefetch = Image.prefetch(post.url);

        // Get image dimensions
        const dimensionsPromise = new Promise<{ id: string; ratio: number }>((resolve, reject) => {
          Image.getSize(post.url,
            (width, height) => {
              const aspectRatio = width / height;
              resolve({ id: post.id, ratio: aspectRatio });
            },
            (error) => {
              console.error('Error loading image dimensions:', error);
              resolve({ id: post.id, ratio: 1 });
            }
          );
        });

        return Promise.all([imagePrefetch, dimensionsPromise]);
      });

      // Wait for all prefetch operations to complete
      const results = await Promise.all(prefetchPromises);

      // Update aspect ratios
      const newRatios: Record<string, number> = {};
      results.forEach(([_, { id, ratio }]) => {
        newRatios[id] = ratio;
      });
      setAspectRatios(newRatios);
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  };

  const fetchUserAndPosts = async () => {
    try {
      const targetUserId = route.params?.userId || authUser?.id;
      if (!targetUserId) {
        console.error('No user ID available');
        setLoading(false);
        return;
      }

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (userError) throw userError;

      // Fetch user's photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      setUser(userData as User);
      setPosts(photosData as Photo[]);

      // Prefetch all images in the background
      prefetchImages(photosData as Photo[]);

      // Also prefetch the profile picture if it exists
      if (userData.profile_picture_url) {
        Image.prefetch(userData.profile_picture_url);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserAndPosts();
  }, [route.params?.userId, authUser?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserAndPosts();
  };

  const handleProfileImagePress = async () => {
    if (!user || user.id !== authUser?.id) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        setUploadingImage(true);

        // Optimize the image
        const optimizedImage = await optimizeImage(result.assets[0].uri, {
          isProfilePicture: true,
          quality: 0.8
        });

        const fileExt = optimizedImage.uri.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        // Create FormData for the image
        const formData = new FormData();
        formData.append('file', {
          uri: optimizedImage.uri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);

        // Delete old profile picture if exists
        if (user.profile_picture_url) {
          const oldFileName = user.profile_picture_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('profile-pictures')
              .remove([`${user.id}/${oldFileName}`]);
          }
        }

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, formData);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('Storage not configured. Please contact support.');
          }
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(fileName);

        if (!urlData?.publicUrl) throw new Error('Failed to get public URL');

        // Update profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            profile_picture_url: urlData.publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw new Error('Failed to update profile');
        }

        // Update local state
        setUser(prev => prev ? {
          ...prev,
          profile_picture_url: urlData.publicUrl
        } : null);
      }
    } catch (err) {
      console.error('Error updating profile picture:', err);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const SettingsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSettings}
      onRequestClose={() => setShowSettings(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowSettings(false)}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={24} color={colors.error} />
            <Text style={[styles.settingsText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const navigateToSettings = () => {
    // TODO: Implement settings navigation
    Alert.alert('Coming Soon', 'Settings page is under development');
  };

  const navigateToEditProfile = () => {
    // TODO: Implement edit profile navigation
    Alert.alert('Coming Soon', 'Edit profile page is under development');
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Delete from Supabase storage first
      const photoToDelete = posts.find(p => p.id === photoId);
      if (photoToDelete) {
        const fileName = photoToDelete.url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('posts')
            .remove([fileName]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      // Update local state
      setPosts(posts.filter(post => post.id !== photoId));
      setMenuVisible(null);
    } catch (err) {
      console.error('Error deleting photo:', err);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const renderGalleryItem: ListRenderItem<Photo> = ({ item }) => (
    <TouchableOpacity
      style={styles.galleryItem}
      onPress={() => {
        setSelectedPhoto(item);
        setPhotoViewerVisible(true);
      }}
    >
      <Image
        source={{ uri: item.url }}
        style={[styles.galleryImage, { aspectRatio: aspectRatios[item.id] || 1 }]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          }
        ]}
      >
        <Text style={styles.headerUsername}>@{user?.username}</Text>
      </Animated.View>

      <AnimatedFlatList
        data={posts}
        renderItem={renderGalleryItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.scrollableHeader}>
            <Animated.View
              style={[
                styles.profileSection,
                {
                  transform: [{ scale: profileScale }]
                }
              ]}
            >
              <View style={styles.profileImageContainer}>
                <TouchableOpacity onPress={handleProfileImagePress}>
                  <Image
                    source={{
                      uri: user?.profile_picture_url || 'https://via.placeholder.com/160'
                    }}
                    style={styles.profileImage}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.name}>{user?.name}</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={navigateToEditProfile}
                >
                  <Text style={styles.actionButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={navigateToSettings}
                >
                  <Feather name="settings" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Share your first photo!</Text>
          </View>
        }
      />

      <PhotoViewer
        visible={photoViewerVisible}
        photo={selectedPhoto}
        onClose={() => {
          setPhotoViewerVisible(false);
          setSelectedPhoto(null);
        }}
        onDelete={handleDeletePhoto}
        isOwner={true}
      />

      <SettingsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOTAL_HEADER_HEIGHT,
    backgroundColor: colors.background,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingTop: STATUS_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUsername: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollableHeader: {
    paddingTop: TOTAL_HEADER_HEIGHT + spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileImageContainer: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: spacing.sm,
  },
  actionButtonText: {
    color: colors.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GALLERY_SPACING,
  },
  galleryItem: {
    width: GALLERY_COLUMN_WIDTH,
    marginBottom: GALLERY_SPACING,
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    backgroundColor: colors.surface,
  },
  emptyContainer: {
    paddingTop: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
  },
  text: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: layout.borderRadius.lg,
    borderTopRightRadius: layout.borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  settingsText: {
    marginLeft: spacing.md,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
  },
  placeholderImage: {
    opacity: 0.7,
    backgroundColor: colors.surface,
  },
  placeholderBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: layout.borderRadius.sm,
    marginTop: spacing.xs,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
  },
  placeholderTitle: {
    fontSize: typography.title.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  placeholderDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
    ...shadows.sm,
  },
  inviteButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});

export default ProfilePage;
