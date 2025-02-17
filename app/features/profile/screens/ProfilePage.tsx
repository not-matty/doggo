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
const HEADER_HEIGHT = 70;
const PROFILE_IMAGE_SIZE = 80;
const GALLERY_SPACING = 2;
const GALLERY_COLUMN_WIDTH = (width - GALLERY_SPACING * 3) / 2;

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

  useEffect(() => {
    fetchUserAndPosts();
  }, [route.params?.userId, authUser?.id]);

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
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const renderGalleryItem = ({ item, index }: { item: Photo; index: number }) => {
    const imageHeight = GALLERY_COLUMN_WIDTH * (1 + (index % 2 === 0 ? 0.2 : -0.2));

    return (
      <View style={[styles.galleryItem, { height: imageHeight }]}>
        <TouchableOpacity
          style={styles.galleryImageContainer}
          onPress={() => {
            setSelectedPhoto(item);
            setPhotoViewerVisible(true);
          }}
        >
          <Image
            source={{ uri: item.url }}
            style={styles.galleryImage}
          />
        </TouchableOpacity>
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

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity
              onPress={handleProfileImagePress}
              disabled={uploadingImage || user.id !== authUser?.id}
              style={styles.profileImageTouchable}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Image
                    source={{
                      uri: user.is_placeholder ?
                        'https://via.placeholder.com/80?text=Not+On+App' :
                        (user.profile_picture_url || 'https://via.placeholder.com/80')
                    }}
                    style={[
                      styles.profileImage,
                      user.is_placeholder && styles.placeholderImage
                    ]}
                    defaultSource={require('@assets/images/Default_pfp.svg.png')}
                  />
                  {!user.is_placeholder && user.id === authUser?.id && (
                    <View style={styles.editProfileImageOverlay}>
                      <Feather name="camera" size={16} color={colors.primary} />
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.name}>{user.name}</Text>
            {!user.is_placeholder && (
              <Text style={styles.username}>@{user.username}</Text>
            )}
            {user.is_placeholder && (
              <View style={styles.placeholderBadge}>
                <Text style={styles.placeholderText}>Not on app yet</Text>
              </View>
            )}
            {!user.is_placeholder && user.id === authUser?.id && (
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={navigateToEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {!user.is_placeholder && user.id === authUser?.id && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Feather name="settings" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {user.is_placeholder ? (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderTitle}>Invite to Join</Text>
          <Text style={styles.placeholderDescription}>
            {user.name} isn't on the app yet. When they join using {user.phone},
            they'll be able to see your likes and photos.
          </Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => {
              // TODO: Implement share/invite functionality
              Alert.alert('Coming Soon', 'Invite functionality is under development');
            }}
          >
            <Text style={styles.inviteButtonText}>Send Invite</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderGalleryItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.galleryContainer}
          columnWrapperStyle={styles.galleryRow}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
        />
      )}

      <PhotoViewer
        visible={photoViewerVisible}
        photo={selectedPhoto}
        onClose={() => {
          setPhotoViewerVisible(false);
          setSelectedPhoto(null);
        }}
        onDelete={handleDeletePhoto}
        isOwner={user?.id === authUser?.id}
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
  header: {
    height: HEADER_HEIGHT + PROFILE_IMAGE_SIZE + 20,
    paddingTop: HEADER_HEIGHT - 20,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
  },
  profileImageContainer: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  profileImageTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: colors.surface,
  },
  editProfileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  userInfo: {
    flex: 1,
    paddingTop: 5,
  },
  name: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  username: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  editProfileButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  editProfileText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 12,
    marginLeft: 'auto',
    marginTop: 5,
  },
  galleryContainer: {
    padding: GALLERY_SPACING,
  },
  galleryRow: {
    justifyContent: 'space-between',
    marginBottom: GALLERY_SPACING,
  },
  galleryItem: {
    width: GALLERY_COLUMN_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImageContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
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
