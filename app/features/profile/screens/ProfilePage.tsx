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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase, clerkIdToUuid } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import Feather from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, layout, shadows } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { optimizeImage } from '../../../utils/imageOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Photo {
  id: string;
  url: string;
  user_id: string;
  created_at: string;
  caption?: string;
  user?: {
    id: string;
    name: string;
    username: string;
    profile_picture_url?: string | null;
    clerk_id: string;
  };
}

interface Profile {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string | null;
  clerk_id: string;
  bio?: string;
  created_at: string;
  updated_at: string;
  photos?: Photo[];
}

type ProfilePageNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfilePage'>;
type ProfilePageRouteProp = RouteProp<ProfileStackParamList, 'ProfilePage'>;

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 80;
const HEADER_PADDING = 16;
const PHOTO_GAP = 16;
const GALLERY_COLUMN_WIDTH = (width - (HEADER_PADDING * 2) - PHOTO_GAP) / 2;
const USERNAME_LEFT = HEADER_PADDING;
const PHOTO_WIDTH = (width - (HEADER_PADDING * 2));

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Photo>);

const ProfilePage: React.FC = () => {
  const route = useRoute<ProfilePageRouteProp>();
  const navigation = useNavigation<ProfilePageNavigationProp>();
  const { user: authUser, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [leftColumn, setLeftColumn] = useState<Photo[]>([]);
  const [rightColumn, setRightColumn] = useState<Photo[]>([]);
  const scrollY = new Animated.Value(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [0, -TOTAL_HEADER_HEIGHT],
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
      const prefetchPromises = imagesToPrefetch.map(photo => {
        // Prefetch the image
        const imagePrefetch = Image.prefetch(photo.url);

        // Get image dimensions with error handling
        const dimensionsPromise = new Promise<{ id: string; height: number }>((resolve) => {
          Image.getSize(
            photo.url,
            (width, height) => {
              const scaledHeight = (GALLERY_COLUMN_WIDTH / width) * height;
              resolve({ id: photo.id, height: scaledHeight });
            },
            () => {
              // Fallback to square if error
              resolve({ id: photo.id, height: GALLERY_COLUMN_WIDTH });
            }
          );
        });

        return Promise.all([imagePrefetch, dimensionsPromise]);
      });

      // Wait for all prefetch operations to complete
      const results = await Promise.all(prefetchPromises);

      // Update image heights
      const newHeights: Record<string, number> = {};
      results.forEach(([_, { id, height }]) => {
        newHeights[id] = height;
      });
      setImageHeights(newHeights);
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  };

  const fetchUserAndPosts = async () => {
    try {
      setLoading(true);

      // Get user ID from multiple sources
      let userId = authUser?.id;

      // If authUser is not available, try from AsyncStorage
      if (!userId) {
        const clerkId = await AsyncStorage.getItem('clerk_user_id');
        const supabaseUuid = await AsyncStorage.getItem('supabase_uuid');
        userId = supabaseUuid || (clerkId ? clerkIdToUuid(clerkId) : undefined);

        if (!userId) {
          console.log('No user ID available for profile fetch');
          setLoading(false);
          return;
        }
        console.log('Using user ID from AsyncStorage:', userId);
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          username,
          profile_picture_url,
          clerk_id,
          bio,
          created_at,
          updated_at,
          photos (
            id,
            url,
            caption,
            created_at,
            user_id
          )
        `)
        .eq('clerk_id', userId)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile(profileData);
        if (profileData.photos) {
          const sortedPhotos = [...profileData.photos].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setPhotos(sortedPhotos);
          await prefetchImages(sortedPhotos);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authUser?.id) {
      fetchUserAndPosts();
    } else {
      // Try to use saved credentials
      const checkStoredProfile = async () => {
        try {
          const clerkId = await AsyncStorage.getItem('clerk_user_id');
          const supabaseUuid = await AsyncStorage.getItem('supabase_uuid');
          const profileId = await AsyncStorage.getItem('profile_id');

          if (profileId || supabaseUuid || clerkId) {
            console.log('Found stored credentials, fetching profile');
            fetchUserAndPosts();
          } else {
            // No stored credentials, no point in loading
            console.log('No stored credentials, skipping profile fetch');
            setLoading(false);
          }
        } catch (error) {
          console.error('Error checking stored profile:', error);
          setLoading(false);
        }
      };

      checkStoredProfile();

      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (loading) {
          console.log('Profile load timeout - forcing exit from loading state');
          setLoading(false);
        }
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [authUser?.id]);

  useEffect(() => {
    // Simple alternating distribution of posts between columns
    const left: Photo[] = [];
    const right: Photo[] = [];

    photos.forEach((photo, index) => {
      if (index % 2 === 0) {
        left.push(photo);
      } else {
        right.push(photo);
      }
    });

    setLeftColumn(left);
    setRightColumn(right);
  }, [photos]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserAndPosts();
  };

  const handleProfileImagePress = async () => {
    if (!profile || profile.id !== authUser?.id) return;

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
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;

        // Create FormData for the image
        const formData = new FormData();
        formData.append('file', {
          uri: optimizedImage.uri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);

        // Delete old profile picture if exists
        if (profile.profile_picture_url) {
          const oldFileName = profile.profile_picture_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('profile-pictures')
              .remove([`${profile.id}/${oldFileName}`]);
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
          .eq('id', profile.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw new Error('Failed to update profile');
        }

        // Update local state
        setProfile(prev => prev ? {
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
    navigation.navigate('EditProfile');
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Delete from Supabase storage first
      const photoToDelete = photos.find(p => p.id === photoId);
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
      setPhotos(photos.filter(post => post.id !== photoId));
      setMenuVisible(null);
    } catch (err) {
      console.error('Error deleting photo:', err);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const renderColumn = (photos: Photo[], isRightColumn: boolean) => {
    return (
      <View style={[
        styles.column,
        {
          marginLeft: isRightColumn ? PHOTO_GAP : 0,
        }
      ]}>
        {photos.map((photo) => {
          const height = imageHeights[photo.id] || GALLERY_COLUMN_WIDTH;
          return (
            <TouchableOpacity
              key={photo.id}
              style={[
                styles.galleryItem,
                {
                  width: GALLERY_COLUMN_WIDTH,
                  height,
                  marginBottom: PHOTO_GAP,
                }
              ]}
              onPress={() => {
                setSelectedPhoto(photo);
                setPhotoViewerVisible(true);
              }}
            >
              <Image
                source={{ uri: photo.url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <Text style={styles.headerUsername}>@{profile?.username}</Text>
      </View>

      <AnimatedFlatList
        data={[]}
        renderItem={() => null}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingTop: TOTAL_HEADER_HEIGHT }]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <>
            <View style={styles.scrollableHeader}>
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <TouchableOpacity
                    style={styles.profileImageContainer}
                    onPress={handleProfileImagePress}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{
                        uri: profile?.profile_picture_url || 'https://via.placeholder.com/80'
                      }}
                      style={styles.profileImage}
                    />
                    {profile?.id === authUser?.id && (
                      <View style={styles.profileImageOverlay}>
                        <Feather name="camera" size={20} color={colors.background} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.userInfo}>
                    <Text style={styles.name}>{profile?.name}</Text>
                    {profile?.bio && (
                      <Text style={styles.bio}>{profile.bio}</Text>
                    )}
                  </View>
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
                    onPress={() => setShowSettings(true)}
                  >
                    <Feather name="settings" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.galleryContainer}>
              {renderColumn(leftColumn, false)}
              {renderColumn(rightColumn, true)}
            </View>
          </>
        }
        ListEmptyComponent={
          photos.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : null
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
    paddingTop: STATUS_BAR_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: HEADER_PADDING,
  },
  headerUsername: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    alignSelf: 'flex-start',
  },
  scrollableHeader: {
    paddingTop: TOTAL_HEADER_HEIGHT + spacing.xl,
    paddingHorizontal: HEADER_PADDING,
    backgroundColor: colors.background,
  },
  profileSection: {
    marginBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileImageContainer: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    marginRight: spacing.md,
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
    flex: 1,
  },
  name: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: 20,
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
    paddingBottom: spacing.xl * 2,
  },
  galleryContainer: {
    flexDirection: 'row',
    paddingHorizontal: HEADER_PADDING,
    marginTop: spacing.xl,
  },
  column: {
    flex: 1,
  },
  galleryItem: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
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
  profileImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfilePage;
