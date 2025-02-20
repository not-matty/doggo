// app/features/profile/screens/ProfileDetailsScreen.tsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
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
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ProfileStackParamList, User, Post } from '@navigation/types';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import { colors, spacing, typography, layout } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { Feather } from '@expo/vector-icons';
import api from '@services/api';
import * as Contacts from 'expo-contacts';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 80;
const HEADER_PADDING = 16;
const PHOTO_GAP = 16;
const GALLERY_COLUMN_WIDTH = (width - (HEADER_PADDING * 2) - PHOTO_GAP) / 2;
const BACK_BUTTON_WIDTH = 40;
const USERNAME_LEFT = HEADER_PADDING + BACK_BUTTON_WIDTH;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

const DEFAULT_PLACEHOLDER_USER: User = {
  id: 'placeholder',
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
  const route = useRoute<ProfileDetailsRouteProp>();
  const { user: authUser } = useContext(AuthContext);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);
  const [isLoading, setIsLoading] = useState(true);
  const [leftColumn, setLeftColumn] = useState<Post[]>([]);
  const [rightColumn, setRightColumn] = useState<Post[]>([]);

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
    fetchUserAndPosts();
  }, [route.params?.userId]);

  useEffect(() => {
    // Pre-calculate image heights
    posts.forEach(post => {
      if (!imageHeights[post.id]) {
        Image.getSize(post.url, (width, height) => {
          const aspectRatio = width / height;
          const calculatedHeight = GALLERY_COLUMN_WIDTH / aspectRatio;
          setImageHeights(prev => ({
            ...prev,
            [post.id]: calculatedHeight
          }));
        }, (error) => {
          console.error('Error loading image dimensions:', error);
          // Fallback to square if error
          setImageHeights(prev => ({
            ...prev,
            [post.id]: GALLERY_COLUMN_WIDTH
          }));
        });
      }
    });
  }, [posts]);

  useEffect(() => {
    // Simple alternating distribution of posts between columns
    const left: Post[] = [];
    const right: Post[] = [];

    posts.forEach((post, index) => {
      if (index % 2 === 0) {
        left.push(post);
      } else {
        right.push(post);
      }
    });

    setLeftColumn(left);
    setRightColumn(right);
  }, [posts]);

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

  const fetchUserAndPosts = async () => {
    try {
      setIsLoading(true);

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', route.params.userId)
        .single();

      if (userError) {
        // If user not found, they might be unregistered
        // Check unregistered_contacts table
        const { data: unregisteredData, error: unregisteredError } = await supabase
          .from('unregistered_contacts')
          .select('name, phone')
          .eq('id', route.params.userId)
          .single();

        if (unregisteredError) {
          console.error('Error fetching unregistered contact:', unregisteredError);
          throw unregisteredError;
        }

        // Create a placeholder user with the unregistered contact's info
        const placeholderUser = {
          ...DEFAULT_PLACEHOLDER_USER,
          name: unregisteredData.name,
          phone: unregisteredData.phone,
        };

        setUser(placeholderUser);
        setPosts([]); // No posts for unregistered users
        setIsLoading(false);
        return;
      }

      // Get contact name if this is an unregistered user
      if (userData.phone) {
        const contactName = await getContactName(userData.phone);
        setDisplayName(contactName || userData.username || 'Unknown User');
      }

      // User exists, fetch their photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', route.params.userId)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      setUser(userData as User);
      setPosts(photosData as Post[]);

      // Prefetch all images in the background
      await prefetchImages(photosData as Post[]);

      // Also prefetch the profile picture if it exists
      if (userData.profile_picture_url) {
        await Image.prefetch(userData.profile_picture_url);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeUser = async () => {
    if (!user || !authUser) return;

    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', authUser.id)
        .eq('liked_id', user.id)
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
          liker_id: authUser.id,
          liked_id: user.id
        }]);

      if (likeError) throw likeError;

      // Check if it's a mutual like
      const { data: mutualLike, error: mutualCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', user.id)
        .eq('liked_id', authUser.id)
        .single();

      if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

      if (mutualLike) {
        // Create a match
        const { error: matchError } = await supabase
          .from('matches')
          .insert([{
            user1_id: authUser.id,
            user2_id: user.id
          }]);

        if (matchError) throw matchError;

        // Create match notification
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: authUser.id,
              type: 'match',
              data: { matched_user_id: user.id }
            },
            {
              user_id: user.id,
              type: 'match',
              data: { matched_user_id: authUser.id }
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
            data: { liker_id: authUser.id }
          }]);

        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      }
    } catch (err) {
      console.error('Error liking user:', err);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    }
  };

  const handleLikeUnregistered = async () => {
    if (!user) return;

    try {
      // Store the like in the database
      const { error: likeError } = await supabase
        .from('unregistered_likes')
        .insert([{
          user_id: authUser?.id,
          phone: user.phone,
          created_at: new Date().toISOString()
        }]);

      if (likeError) throw likeError;

      // Send SMS invite
      const { data: response, error: smsError } = await supabase.functions.invoke('send-invite', {
        body: { phone: user.phone, fromUserName: authUser?.name || 'Someone' }
      });

      if (smsError) {
        console.error('Error sending invite:', smsError);
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
        return;
      }

      if (response?.success) {
        Alert.alert('Success', `Liked and invited ${user.name} to join doggo!`);
      } else {
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
      }
    } catch (err) {
      console.error('Error liking unregistered user:', err);
      Alert.alert('Error', 'Failed to send like. Please try again.');
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
    await fetchUserAndPosts();
    setRefreshing(false);
  };

  const prefetchImages = async (imagesToPrefetch: Post[]) => {
    try {
      // Create an array of prefetch promises
      const prefetchPromises = imagesToPrefetch.map(post => {
        // Prefetch the image
        const imagePrefetch = Image.prefetch(post.url);

        // Get image dimensions with error handling
        const dimensionsPromise = new Promise<{ id: string; height: number }>((resolve) => {
          Image.getSize(
            post.url,
            (width, height) => {
              const scaledHeight = (GALLERY_COLUMN_WIDTH / width) * height;
              resolve({ id: post.id, height: scaledHeight });
            },
            () => {
              // Fallback to square if error
              resolve({ id: post.id, height: GALLERY_COLUMN_WIDTH });
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
                styles.galleryItem,
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
                style={styles.galleryImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderProfileInfo = () => {
    if (!user) return null;

    return (
      <View style={styles.profileInfo}>
        <Image
          source={{ uri: user.profile_picture_url || 'https://via.placeholder.com/150' }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        {authUser?.id !== user.id && (
          <TouchableOpacity
            style={[
              styles.likeButton,
              user.is_placeholder && { backgroundColor: colors.accent }
            ]}
            onPress={user.is_placeholder ? handleLikeUnregistered : handleLikeUser}
          >
            <Text style={[
              styles.likeButtonText,
              user.is_placeholder && { color: colors.background }
            ]}>
              {user.is_placeholder ? 'Invite' : 'Like'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderContent = () => (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            transform: [{ translateY: headerTranslateY }],
            opacity: headerOpacity,
          }
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.username, { marginLeft: USERNAME_LEFT }]}>
            {user?.username ? `@${user.username}` : ''}
          </Text>
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.contentContainer}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={renderProfileInfo}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />

      <PhotoViewer
        visible={photoViewerVisible}
        photo={selectedPost}
        onClose={() => {
          setPhotoViewerVisible(false);
          setSelectedPost(null);
        }}
        onDelete={handleDeletePost}
        isOwner={selectedPost?.user_id === authUser?.id}
      />
    </SafeAreaView>
  );

  if (loading) {
    return (
      <View style={styles.container}>
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
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: TOTAL_HEADER_HEIGHT,
    backgroundColor: colors.background,
  },
  header: {
    height: HEADER_HEIGHT,
    marginTop: STATUS_BAR_HEIGHT,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  username: {
    fontSize: typography.title.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  contentContainer: {
    paddingTop: TOTAL_HEADER_HEIGHT,
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
  mainContent: {
    flex: 1,
  },
  profileInfo: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  likeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.full,
    marginTop: spacing.md,
  },
  likeButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: spacing.xl,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
