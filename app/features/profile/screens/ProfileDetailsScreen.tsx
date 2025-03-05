// app/features/profile/screens/ProfileDetailsScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '@navigation/types';
import { supabase } from '@services/supabase';
import { useClerkAuthContext } from '@context/ClerkAuthContext';
import { colors, spacing, typography } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import PhotoGrid from '@components/common/PhotoGrid';
import { useProfile } from '../../../hooks/useProfile';
import { useLikeStatus, useToggleLike, useUnregisteredLikeStatus, useToggleUnregisteredLike } from '../../../hooks/useLikes';
import { useUserPosts, Photo } from '../../../hooks/usePosts';
import { ProfileSkeleton } from '@components/common/SkeletonLoader';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;
type ProfileDetailsNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileDetails'>;

interface ProfileDetailsScreenProps {
  route: ProfileDetailsRouteProp;
  navigation: ProfileDetailsNavigationProp;
}

// Define type for unregistered contact explicitly
interface UnregisteredContact {
  id: string;
  name: string;
  phone: string;
  user_id: string;
  created_at: string;
}

// Define the Profile type
interface Profile {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  bio?: string;
  clerk_id?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// Add the PhotoGridPhoto type to avoid confusion with the imported Photo type
interface PhotoGridPhoto {
  id: string;
  url: string;
  [key: string]: any;
}

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 64;
const HEADER_PADDING = 16;
const PHOTO_GAP = 16;
const GALLERY_COLUMN_WIDTH = (width - (HEADER_PADDING * 2) - PHOTO_GAP) / 2;

const ProfileDetailsScreen = ({ route, navigation }: ProfileDetailsScreenProps) => {
  const { userId, placeholderContact } = route.params;
  const { user: contextUser } = useClerkAuthContext();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Type the profile data
  const {
    data: profile,
    isLoading: isProfileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useProfile(userId);

  // Ensure we get properly typed posts data
  const {
    data: postsData,
    isLoading: isPostsLoading,
    refetch: refetchPosts
  } = useUserPosts(userId);

  // Extract posts from the infinite query result with proper typing
  const posts = postsData?.pages
    ? postsData.pages.flatMap(page => (page as any).posts || [])
    : [];

  // Fix like status hooks to use proper profile id
  const {
    data: likeStatus,
    isLoading: isLikeStatusLoading
  } = useLikeStatus(
    contextUser?.id,
    profile?.id
  );

  // Use the like status hooks based on whether this is a registered or unregistered user
  const {
    data: unregisteredLikeStatus,
    isLoading: isUnregisteredLikeStatusLoading
  } = useUnregisteredLikeStatus(
    contextUser?.id,
    placeholderContact?.phone_number
  );

  // Like/unlike mutation hooks
  const toggleLike = useToggleLike();
  const toggleUnregisteredLike = useToggleUnregisteredLike();

  // Local state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Photo | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Derived state
  const isProfileOwner = contextUser?.id === profile?.id;
  const isLiked = profile ? likeStatus === 'liked' : unregisteredLikeStatus === 'liked';
  const isLikeLoading = isLikeStatusLoading ||
    isUnregisteredLikeStatusLoading ||
    toggleLike.isPending ||
    toggleUnregisteredLike.isPending;

  // Handle like for registered users
  const handleLikeUser = async () => {
    if (!contextUser?.id || !profile?.id) {
      Alert.alert('Error', 'You must be logged in to like users.');
      return;
    }

    try {
      const result = await toggleLike.mutateAsync({
        likerId: contextUser.id,
        likedId: profile.id
      });

      if (result.isMatch) {
        Alert.alert('Match!', `You and ${profile.name} have liked each other!`);
      } else if (result.liked) {
        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      } else {
        // Like removed
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    }
  };

  // Handle like for unregistered users
  const handleLikeUnregistered = async () => {
    if (!contextUser?.id || !placeholderContact?.phone_number) {
      Alert.alert('Error', 'Cannot like this user (missing contact information)');
      return;
    }

    try {
      const result = await toggleUnregisteredLike.mutateAsync({
        userId: contextUser.id,
        phone: placeholderContact.phone_number
      });

      if (result.liked) {
        Alert.alert('Success', `Liked and invited ${placeholderContact.name || 'your contact'} to join doggo!`);
      } else {
        Alert.alert('Unliked', `You have unliked this contact.`);
      }
    } catch (err) {
      console.error('Error liking unregistered contact:', err);
      Alert.alert('Error', 'Failed to like contact. Please try again.');
    }
  };

  // Handle deletion of a post
  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Update posts list after deletion
      refetchPosts();

      // Close the photo viewer
      setPhotoViewerVisible(false);
      setSelectedPost(null);
    } catch (err) {
      console.error('Error deleting photo:', err);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refetchProfile && refetchPosts) {
        await Promise.all([refetchProfile(), refetchPosts()]);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [0, -TOTAL_HEADER_HEIGHT],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  if (isProfileLoading && !isRefreshing) {
    return <ProfileSkeleton />;
  }

  if (profileError && !placeholderContact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading profile. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Safely access profile data
  const profileData = profile as Profile;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileContainer}>
            <Image
              source={
                profileData.profile_picture_url
                  ? { uri: profileData.profile_picture_url }
                  : require('@assets/images/Default_pfp.svg.png')
              }
              style={styles.profileImage}
            />
            <View style={styles.userInfo}>
              <Text style={styles.name}>
                {profileData.name || placeholderContact?.name || 'Unknown'}
              </Text>
              <Text style={styles.username}>
                {placeholderContact
                  ? 'Not on doggo yet'
                  : `@${profileData.username || 'unknown'}`}
              </Text>
              {profileData.bio && <Text style={styles.bio}>{profileData.bio}</Text>}
            </View>
          </View>

          <View style={styles.actionButtons}>
            {!isProfileOwner && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isLiked && styles.likedButton
                ]}
                onPress={placeholderContact ? handleLikeUnregistered : handleLikeUser}
                disabled={isLikeLoading}
              >
                <Text style={styles.actionButtonText}>
                  {isLikeLoading
                    ? 'Loading...'
                    : isLiked
                      ? 'Liked'
                      : placeholderContact
                        ? 'Invite'
                        : 'Like'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Posts Grid */}
        <PhotoGrid
          photos={posts || []}
          onPhotoPress={(photo) => {
            // Ensure we safely convert the PhotoGrid's Photo type to our Photo type
            if (!photo || !photo.id || !photo.url) {
              console.warn('Invalid photo object:', photo);
              return;
            }
            setSelectedPost(photo as unknown as Photo);
            setPhotoViewerVisible(true);
          }}
          columns={2}
          loading={isPostsLoading}
          emptyMessage={`${profileData?.name || 'This user'} hasn't posted any photos yet.`}
        />
      </ScrollView>
      {/* Photo Viewer Modal */}
      {selectedPost && (
        <PhotoViewer
          visible={photoViewerVisible}
          photo={selectedPost}
          onClose={() => {
            setPhotoViewerVisible(false);
            setSelectedPost(null);
          }}
          onDelete={handleDeletePost}
          isOwner={isProfileOwner}
        />
      )}
    </SafeAreaView>
  );
};

export default ProfileDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOTAL_HEADER_HEIGHT,
    backgroundColor: colors.background,
    paddingTop: STATUS_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // To balance with the back button
  },
  profileHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
    marginBottom: 4,
  },
  username: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bio: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

