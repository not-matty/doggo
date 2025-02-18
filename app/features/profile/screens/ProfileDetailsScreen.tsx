// app/features/profile/screens/ProfileDetailsScreen.tsx

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
  ListRenderItem,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ProfileStackParamList, User, Post } from '@navigation/types';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import { colors, spacing, typography, layout } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { Feather } from '@expo/vector-icons';
import api from '@services/api';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;

const { width } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;
const PROFILE_IMAGE_SIZE = 80;
const GALLERY_SPACING = 24;
const GALLERY_COLUMN_WIDTH = (width - GALLERY_SPACING * 3) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Post>);

const ProfileDetailsScreen: React.FC = () => {
  const route = useRoute<ProfileDetailsRouteProp>();
  const { user: authUser } = useContext(AuthContext);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchUserAndPosts = async () => {
    try {
      setIsLoading(true);
      const userResponse = await api.get(`/users/${route.params.userId}`);
      const postsResponse = await api.get(`/users/${route.params.userId}/posts`);

      setUser(userResponse.data);
      setPosts(postsResponse.data);

      // Prefetch all images including profile picture
      const allImages = [...postsResponse.data];
      if (userResponse.data.profilePicture) {
        await Image.prefetch(userResponse.data.profilePicture);
      }
      await prefetchImages(allImages);

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
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

      // Update image heights
      const newHeights: Record<string, number> = {};
      results.forEach(([_, { id, ratio }]) => {
        newHeights[id] = ratio;
      });
      setImageHeights(newHeights);
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  };

  const renderGalleryItem: ListRenderItem<Post> = ({ item }) => (
    <TouchableOpacity
      style={styles.galleryItem}
      onPress={() => {
        setSelectedPost(item);
        setPhotoViewerVisible(true);
      }}
    >
      <Image
        source={{ uri: item.url }}
        style={[styles.galleryImage, { aspectRatio: imageHeights[item.id] || 1 }]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loadingIndicator} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
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
                <Image
                  source={{
                    uri: user?.profile_picture_url || 'https://via.placeholder.com/160'
                  }}
                  style={styles.profileImage}
                />
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.name}>{user?.name}</Text>
              </View>

              {!user?.is_placeholder && user?.id !== authUser?.id && (
                <TouchableOpacity
                  style={styles.likeButton}
                  onPress={handleLikeUser}
                >
                  <Feather name="heart" size={20} color={colors.primary} />
                  <Text style={styles.likeButtonText}>Like</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        }
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
    </View>
  );
};

export default ProfileDetailsScreen;

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
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.md,
  },
  likeButtonText: {
    color: colors.primary,
    marginLeft: spacing.sm,
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
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  loadingIndicator: {
    marginTop: spacing.xl,
  },
});
