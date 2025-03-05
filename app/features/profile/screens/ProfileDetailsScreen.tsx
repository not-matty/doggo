// app/features/profile/screens/ProfileDetailsScreen.tsx

import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
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
  ListRenderItem,
  Animated,
  Platform,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { ProfileStackParamList, User, Post } from '@navigation/types';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import { useClerkAuthContext, Profile } from '@context/ClerkAuthContext';
import { colors, spacing, typography, layout } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { Feather } from '@expo/vector-icons';
import api from '@services/api';
import * as Contacts from 'expo-contacts';
import { useApp } from '@context/AppContext';
import PhotoGrid from '@components/common/PhotoGrid';
import ProfileHeader from '@components/profile/ProfileHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;
type ProfileDetailsNavigationProp = any; // Assuming the navigation prop type

// Define type for unregistered contact explicitly
interface UnregisteredContact {
  id: string;
  name: string;
  phone: string;
  user_id: string;
  created_at: string;
}

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 64;
const HEADER_PADDING = 16;
const PHOTO_GAP = 16;
const GALLERY_COLUMN_WIDTH = (width - (HEADER_PADDING * 2) - PHOTO_GAP) / 2;
const BACK_BUTTON_WIDTH = 40;
const USERNAME_LEFT = HEADER_PADDING + BACK_BUTTON_WIDTH;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

const DEFAULT_PLACEHOLDER_USER: User = {
  id: 'placeholder',
  clerk_id: 'placeholder',
  name: '',  // Will be filled in with actual name
  username: '',
  profile_picture_url: require('@assets/images/Default_pfp.svg.png'),
  phone: '',  // Will be filled in with actual phone
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_placeholder: true,
  bio: 'Tap like to send them an anonymous invite to join doggo!'
};

const ProfileDetailsScreen: React.FC = () => {
  const navigation = useNavigation<ProfileDetailsNavigationProp>();
  const route = useRoute<ProfileDetailsRouteProp>();
  const { userId } = route.params;
  const { state: { profile: currentUserProfile } } = useApp();

  // Access both auth contexts with safe null checking
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();
  const contextUser = clerkAuthContext?.user || authContext?.user;

  // Add isProfileOwner variable
  const isProfileOwner = contextUser?.id === userId;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);
  const [isLikeLoading, setIsLikeLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [leftColumn, setLeftColumn] = useState<Post[]>([]);
  const [rightColumn, setRightColumn] = useState<Post[]>([]);

  // Add a flag to track if checkIfLiked is already running
  const isCheckingLikeRef = useRef(false);

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

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  useEffect(() => {
    if (userId) {
      // Reset loading and error states
      setIsLikeLoading(true);
      setErrorMessage(null);

      // Load profile data
      fetchProfile();

      // Reset flag before checking
      isCheckingLikeRef.current = false;
      checkIfLiked();

      // Remove timeout as it's causing issues
      return () => { };
    } else {
      console.error('No userId provided to ProfileDetailsScreen');
      setIsLikeLoading(false);
      setErrorMessage('No user ID provided');
    }
  }, [userId]);

  const getContactName = async (phoneNumber: string) => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return null;

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const normalizedSearchPhone = phoneNumber.replace(/[^0-9]/g, '');
      const contact = data.find(contact =>
        contact.phoneNumbers?.some(phone =>
          phone.number && phone.number.replace(/[^0-9]/g, '') === normalizedSearchPhone
        )
      );

      return contact?.name || null;
    } catch (error) {
      console.error('Error getting contact name:', error);
      return null;
    }
  };

  const fetchProfile = async () => {
    try {
      if (!userId) {
        console.error('No userId provided for profile fetch');
        setIsLikeLoading(false);
        setErrorMessage('Missing user ID');
        return;
      }

      // Check if we're dealing with a valid UUID before querying
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      if (!isValidUuid) {
        console.log('Invalid UUID format for userId:', userId);
        setIsLikeLoading(false);
        setErrorMessage('Invalid user ID format');
        return;
      }

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        // Log detailed error for debugging
        console.error('Error fetching profile:', userError);

        // If user not found, they might be unregistered
        // Check unregistered_contacts table
        const { data: unregisteredData, error: unregisteredError } = await supabase
          .from('unregistered_contacts')
          .select('id, name, phone, user_id, created_at')
          .eq('id', userId)
          .single();

        if (unregisteredError) {
          console.error('Error fetching unregistered contact:', unregisteredError);

          // Last attempt: Check if this is a contact by phone number
          // This handles cases where we have a contact_user_id but not a direct UUID
          if (userError.code === 'PGRST116' && /^\+\d+$/.test(userId)) {
            // If userId looks like a phone number, try to find it in unregistered contacts
            const { data: phoneData, error: phoneError } = await supabase
              .from('unregistered_contacts')
              .select('id, name, phone, user_id, created_at')
              .eq('phone', userId)
              .single();

            if (!phoneError && phoneData) {
              // Create a placeholder user with the unregistered contact's info
              const placeholderUser: User = {
                ...DEFAULT_PLACEHOLDER_USER,
                id: phoneData.id,
                name: phoneData.name,
                phone: phoneData.phone,
              };

              setUser(placeholderUser);
              setPosts([]); // No posts for unregistered users
              setIsLikeLoading(false);
              return;
            }
          }

          setErrorMessage('Unable to find user profile');
          setIsLikeLoading(false);
          return;
        }

        // Create a placeholder user with the unregistered contact's info
        const placeholderUser: User = {
          ...DEFAULT_PLACEHOLDER_USER,
          id: unregisteredData.id,
          name: unregisteredData.name,
          phone: unregisteredData.phone,
        };

        setUser(placeholderUser);
        setPosts([]); // No posts for unregistered users
        setIsLikeLoading(false);
        return;
      }

      setUser(userData);
      setErrorMessage(null); // Clear any previous errors

      // Get contact name if this is an unregistered user
      if (userData.phone) {
        try {
          const contactName = await getContactName(userData.phone);
          setDisplayName(contactName || userData.username || 'Unknown User');
        } catch (error) {
          console.error('Error getting contact name:', error);
          setDisplayName(userData.username || 'Unknown User');
        }
      }

      // User exists, fetch their photos
      const { data: postsData, error: postsError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error fetching posts:', postsError);
      } else if (postsData) {
        setPosts(postsData);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setErrorMessage('An unexpected error occurred');
    } finally {
      // Always exit loading state
      setIsLikeLoading(false);
    }
  };

  const checkIfLiked = async () => {
    // If already checking, don't start another check
    if (isCheckingLikeRef.current) {
      return;
    }

    // Set flag to prevent duplicate runs
    isCheckingLikeRef.current = true;

    try {
      // Get authenticated user ID from context or storage
      let currentUserID = contextUser?.id;

      if (!currentUserID) {
        // Try getting user ID from AsyncStorage
        const storedProfileId = await AsyncStorage.getItem('profile_id');

        if (!storedProfileId) {
          console.log('Not authenticated, skipping like check');
          isCheckingLikeRef.current = false;
          return;
        }

        currentUserID = storedProfileId;
      }

      if (!userId) {
        console.log('No target user ID, skipping like check');
        isCheckingLikeRef.current = false;
        return;
      }

      // Check if we're dealing with a valid UUID before querying
      // This helps prevent the "invalid input syntax for type uuid" error
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      if (!isValidUuid) {
        console.log('Invalid UUID format for userId:', userId);
        isCheckingLikeRef.current = false;
        return;
      }

      // Check if current user has liked the profile user
      const { data: likeData, error: likeError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', currentUserID)
        .eq('liked_id', userId)
        .single();

      if (likeError && likeError.code !== 'PGRST116') {
        console.error('Error checking if liked:', likeError);
        isCheckingLikeRef.current = false;
        return;
      }

      setIsLiked(!!likeData);
    } catch (error) {
      console.error('Error in checkIfLiked:', error);
    } finally {
      // Always reset the flag when done
      isCheckingLikeRef.current = false;
    }
  };

  const handleLike = async () => {
    try {
      // Set loading state
      setIsLikeLoading(true);

      // Check if we have a valid user context or profile
      if (!contextUser?.id && !currentUserProfile?.id) {
        Alert.alert('Error', 'You must be logged in to like users.');
        return;
      }

      // Use current user profile ID or context user ID
      const currentUserId = currentUserProfile?.id || contextUser?.id;

      // Make sure the target user ID is valid
      if (!userId) {
        console.error('Cannot like: Missing target user ID');
        return;
      }

      if (isLiked) {
        // Unlike the user
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', userId);

        if (error) throw error;

        setIsLiked(false);
        Alert.alert('Unliked', `You have unliked this user.`);
      } else {
        // Like the user
        const { error } = await supabase
          .from('likes')
          .insert({
            liker_id: currentUserId,
            liked_id: userId,
          });

        if (error) throw error;

        setIsLiked(true);

        // Check if it's a mutual like
        const { data: mutualLike, error: mutualCheckError } = await supabase
          .from('likes')
          .select('id')
          .eq('liker_id', userId)
          .eq('liked_id', currentUserId)
          .single();

        if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

        if (mutualLike) {
          // Create a match
          const { error: matchError } = await supabase
            .from('matches')
            .insert([{
              user1_id: currentUserId,
              user2_id: userId
            }]);

          if (matchError) throw matchError;

          // Create match notifications
          await supabase
            .from('notifications')
            .insert([
              {
                user_id: currentUserId,
                type: 'match',
                data: { matched_user_id: userId }
              },
              {
                user_id: userId,
                type: 'match',
                data: { matched_user_id: currentUserId }
              }
            ]);

          Alert.alert('Match!', `You and ${user?.name || 'this user'} have liked each other!`);
        } else {
          // Create like notification
          await supabase
            .from('notifications')
            .insert([{
              user_id: userId,
              type: 'like',
              data: { liker_id: currentUserId }
            }]);

          Alert.alert('Success', 'Like sent! They will be notified.');
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status. Please try again.');
    } finally {
      // Update loading state
      setIsLikeLoading(false);
    }
  };

  const handleLikeUser = async () => {
    try {
      // Set loading state
      setIsLikeLoading(true);

      if (!user || !contextUser) return;

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', contextUser.clerk_id)
        .eq('liked_id', user.clerk_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingLike) {
        Alert.alert('Already Liked', 'You have already liked this user.');
        return;
      }

      // Add the like
      const { error: likeError } = await supabase
        .from('likes')
        .insert([{
          liker_id: contextUser.clerk_id,
          liked_id: user.clerk_id
        }]);

      if (likeError) throw likeError;

      // Check if it's a mutual like
      const { data: mutualLike, error: mutualCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', user.clerk_id)
        .eq('liked_id', contextUser.clerk_id)
        .single();

      if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

      if (mutualLike) {
        // Create a match
        const { error: matchError } = await supabase
          .from('matches')
          .insert([{
            user1_id: contextUser.id,
            user2_id: user.id
          }]);

        if (matchError) throw matchError;

        // Create match notification
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: contextUser.id,
              type: 'match',
              data: { matched_user_id: user.id }
            },
            {
              user_id: user.id,
              type: 'match',
              data: { matched_user_id: contextUser.id }
            }
          ]);

        Alert.alert('Match!', `You and ${user.name} have liked each other!`);
      } else {
        // Create like notification
        await supabase
          .from('notifications')
          .insert([{
            user_id: user.id,
            type: 'like',
            data: { liker_id: contextUser.clerk_id }
          }]);

        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      }
    } catch (err) {
      console.error('Error liking user:', err);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    } finally {
      // Update loading state
      setIsLikeLoading(false);
    }
  };

  const handleLikeUnregistered = async () => {
    try {
      // Set loading state
      setIsLikeLoading(true);

      if (!user || !user.phone) {
        console.error('Cannot like user: Missing user or phone number');
        Alert.alert('Error', 'Cannot like this user (missing contact information)');
        return;
      }

      // Ensure we have a valid user ID from auth context or AsyncStorage
      let currentUserId = contextUser?.id;
      if (!currentUserId) {
        try {
          const storedProfileId = await AsyncStorage.getItem('profile_id');
          if (storedProfileId) {
            currentUserId = storedProfileId;
          } else {
            console.error('Cannot like user: Not authenticated');
            Alert.alert('Error', 'You need to be logged in to like users');
            return;
          }
        } catch (error) {
          console.error('Error retrieving profile ID:', error);
          Alert.alert('Error', 'Failed to verify your account');
          return;
        }
      }

      // Validate phone number format
      if (!/^\+\d+$/.test(user.phone)) {
        console.error('Invalid phone number format:', user.phone);
        Alert.alert('Error', 'Invalid phone number format for this contact');
        return;
      }

      // Store the like in the database with proper fields and types
      const likeData = {
        user_id: currentUserId,
        phone: user.phone,
        created_at: new Date().toISOString()
      };

      console.log('Inserting unregistered like:', likeData);

      const { error: likeError } = await supabase
        .from('unregistered_likes')
        .insert([likeData]);

      if (likeError) {
        console.error('Database error liking unregistered user:', likeError);
        throw likeError;
      }

      // Send SMS invite
      const { data: response, error: smsError } = await supabase.functions.invoke('send-invite', {
        body: {
          phone: user.phone,
          fromUserName: contextUser?.name || 'Someone'
        }
      });

      if (smsError) {
        console.error('Error sending invite:', smsError);
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
        return;
      }

      if (response?.success) {
        Alert.alert('Success', `Liked and invited ${user.name} to join doggo!`);

        // Update UI state to show we've liked this user
        setIsLiked(true);
      } else {
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
      }
    } catch (err) {
      console.error('Error liking unregistered user:', err);
      Alert.alert('Error', 'Failed to send like. Please try again.');
    } finally {
      // Update loading state
      setIsLikeLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postId));
      setPhotoViewerVisible(false);
      setSelectedPost(null);
    } catch (err) {
      console.error('Error deleting photo:', err);
      Alert.alert('Error', 'Failed to delete photo');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), checkIfLiked()]);
    setRefreshing(false);
  };

  const prefetchImages = async () => {
    try {
      const newHeights: Record<string, number> = {};

      for (const post of posts) {
        const { id, url } = post;

        try {
          // Prefetch the image
          await Image.prefetch(url);

          // Get dimensions
          const { width: imageWidth, height: imageHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            Image.getSize(
              url,
              (width, height) => resolve({ width, height }),
              (error) => reject(error)
            );
          });

          // Calculate height based on aspect ratio
          const aspectRatio = imageWidth / imageHeight;
          const height = GALLERY_COLUMN_WIDTH / aspectRatio;

          newHeights[id] = height;
        } catch (error) {
          console.error(`Error prefetching image ${id}:`, error);
          newHeights[id] = GALLERY_COLUMN_WIDTH; // Default to square
        }
      }

      setImageHeights(newHeights);
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  };

  useEffect(() => {
    if (posts.length === 0 || Object.keys(imageHeights).length === 0) return;

    let leftHeight = 0;
    let rightHeight = 0;
    const left: Post[] = [];
    const right: Post[] = [];

    // Sort posts by creation date (newest first)
    const sortedPosts = [...posts].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Distribute posts to balance column heights
    sortedPosts.forEach(post => {
      const postHeight = imageHeights[post.id] || GALLERY_COLUMN_WIDTH;

      // Add to shorter column
      if (leftHeight <= rightHeight) {
        left.push(post);
        leftHeight += postHeight + PHOTO_GAP;
      } else {
        right.push(post);
        rightHeight += postHeight + PHOTO_GAP;
      }
    });

    setLeftColumn(left);
    setRightColumn(right);
  }, [posts, imageHeights]);

  const renderColumn = (posts: Post[], isRightColumn: boolean) => {
    return (
      <View style={[
        styles.column,
        {
          marginLeft: isRightColumn ? PHOTO_GAP : 0,
        }
      ]}>
        {posts.map((post) => {
          const height = imageHeights[post.id] || GALLERY_COLUMN_WIDTH;
          return (
            <TouchableOpacity
              key={post.id}
              style={[
                styles.postContainer,
                {
                  width: GALLERY_COLUMN_WIDTH,
                  height,
                  marginBottom: PHOTO_GAP,
                }
              ]}
              onPress={() => {
                setSelectedPost(post);
                setPhotoViewerVisible(true);
              }}
            >
              <Image
                source={{ uri: post.url }}
                style={styles.postImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderContent = () => {
    if (errorMessage) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={
                    user?.profile_picture_url
                      ? { uri: user.profile_picture_url }
                      : require('@assets/images/Default_pfp.svg.png')
                  }
                  style={styles.profileImage}
                />
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.name}>
                  {user?.name || 'Unknown'}
                </Text>
                <Text style={styles.username}>
                  {user?.is_placeholder
                    ? 'Not on doggo yet'
                    : '@unknown'}
                </Text>
                {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
              </View>
            </View>

            <View style={styles.actionButtons}>
              {!isProfileOwner && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isLiked && styles.likedButton
                  ]}
                  onPress={user?.is_placeholder ? handleLikeUnregistered : handleLikeUser}
                  disabled={isLikeLoading}
                >
                  <Text style={styles.actionButtonText}>
                    {isLikeLoading
                      ? 'Loading...'
                      : isLiked
                        ? 'Liked'
                        : user?.is_placeholder
                          ? 'Invite'
                          : 'Like'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {posts.length > 0 ? (
            <View style={styles.galleryContainer}>
              {renderColumn(leftColumn, false)}
              {renderColumn(rightColumn, true)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {user?.is_placeholder
                  ? 'This user hasn\'t joined doggo yet'
                  : 'No posts yet'}
              </Text>
            </View>
          )}
        </ScrollView>

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
      </SafeAreaView>
    );
  };

  if (isLikeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return renderContent();
};

export default ProfileDetailsScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: typography.title.fontSize,
  },
  profileSection: {
    paddingHorizontal: HEADER_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileImageContainer: {
    marginRight: spacing.md,
  },
  profileImage: {
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    marginBottom: spacing.sm,
    resizeMode: 'cover',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  username: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bio: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginRight: spacing.sm,
  },
  actionButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  likedButton: {
    backgroundColor: colors.success,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.body.fontSize,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_PADDING,
    marginBottom: PHOTO_GAP,
  },
  postContainer: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
  },
});

