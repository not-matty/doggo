// app/features/home/screens/HomeScreen.tsx

import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
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
  SafeAreaView,
  Animated,
  Platform,
  StatusBar,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Linking,
  FlatListProps,
} from 'react-native';
import { supabase } from '@services/supabase';
import { User } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types';
import { AuthContext } from '@context/AuthContext';
import Feather from 'react-native-vector-icons/Feather';
import { colors, spacing, typography, layout, shadows } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { BlurView } from 'expo-blur';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

interface Post {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    name: string;
    username: string;
    profile_picture_url?: string | null;
    clerk_id: string;
    likes?: number;
  };
}

type PhotoWithProfile = {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    name: string;
    username: string;
    profile_picture_url: string | null;
    clerk_id: string;
    likes: number;
  };
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface ProfileWithPhotos extends User {
  photos?: Photo[];
}

interface ViewableItemsChanged {
  viewableItems: Array<{
    item: Post;
    key: string;
    index: number;
    isViewable: boolean;
    section?: any;
  }>;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList
) as React.ComponentType<FlatListProps<Post>>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [preloadedProfiles, setPreloadedProfiles] = useState<Set<string>>(new Set());

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT],
    outputRange: [0, -TOTAL_HEADER_HEIGHT],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, TOTAL_HEADER_HEIGHT / 2, TOTAL_HEADER_HEIGHT],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });

  const requestContactsPermission = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to see posts from your contacts.'
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          url,
          caption,
          created_at,
          user_id,
          user:profiles!user_id (
            id,
            name,
            username,
            profile_picture_url,
            clerk_id,
            likes
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20)
        .returns<PhotoWithProfile[]>();

      if (error) throw error;

      // Ensure we have valid URLs for all posts
      const postsWithValidUrls = (data || []).map(post => ({
        id: post.id,
        url: post.url || '',
        caption: post.caption,
        created_at: post.created_at,
        user_id: post.user_id,
        user: {
          id: post.user.id,
          name: post.user.name,
          username: post.user.username,
          profile_picture_url: post.user.profile_picture_url || null,
          clerk_id: post.user.clerk_id,
          likes: post.user.likes || 0
        }
      }));

      setPosts(postsWithValidUrls);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to fetch posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkAndRequestImagePermissions();
    if (user?.id) {
      fetchPosts();
    }
  }, [user?.id]);

  const checkAndRequestImagePermissions = async () => {
    try {
      const hasCheckedPermissions = await AsyncStorage.getItem('hasCheckedImagePermissions');
      if (hasCheckedPermissions) return;

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Access Required',
          'doggo needs access to your photos to share and save images. Please enable it in your settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
      }
      await AsyncStorage.setItem('hasCheckedImagePermissions', 'true');
    } catch (error) {
      console.error('Error checking image permissions:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleDeletePost = (postId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  };

  const handleLike = async (post: Post) => {
    try {
      if (!user?.id) return;

      const { error: likeError } = await supabase
        .from('likes')
        .insert([
          {
            liker_id: user.id,
            liked_id: post.user_id,
            created_at: new Date().toISOString()
          }
        ]);

      if (likeError) throw likeError;

      // Optimistically update UI
      const updatedPosts = posts.map(p =>
        p.id === post.id
          ? { ...p, user: { ...p.user, likes: (p.user.likes || 0) + 1 } }
          : p
      );
      setPosts(updatedPosts);

    } catch (error: any) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const navigateToProfile = (userId: string) => {
    // If it's the current user's profile, navigate directly to the Profile tab
    if (user?.id === userId) {
      // @ts-ignore - Navigating to root tab
      navigation.navigate('Profile');
    } else {
      // If it's another user's profile, navigate to their ProfileDetails
      navigation.navigate('ProfileDetails', { userId });
    }
  };

  const preloadProfile = async (userId: string) => {
    if (preloadedProfiles.has(userId)) return;

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          *,
          photos (
            id,
            url,
            caption,
            created_at
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Prefetch profile picture and recent photos
      if (profileData.profile_picture_url) {
        await Image.prefetch(profileData.profile_picture_url);
      }

      if (profileData.photos) {
        const photosToPreload = (profileData as ProfileWithPhotos).photos?.slice(0, 3) || [];
        await Promise.all(photosToPreload.map(photo => Image.prefetch(photo.url)));
      }

      setPreloadedProfiles(prev => new Set([...prev, userId]));
    } catch (error) {
      console.error('Error preloading profile:', error);
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems, changed }: {
    viewableItems: Array<{
      item: Post;
      key: string;
      index: number | null;
      isViewable: boolean;
    }>;
    changed: Array<{
      item: Post;
      key: string;
      index: number | null;
      isViewable: boolean;
    }>;
  }) => {
    viewableItems.forEach(({ item }) => {
      if (item?.user?.id) {
        preloadProfile(item.user.id);
      }
    });
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged }
  ]);

  const renderPost = useCallback(({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.postImageContainer}
        onPress={() => {
          setSelectedPost(item);
          setPhotoViewerVisible(true);
        }}
      >
        <Image
          source={{
            uri: item.url,
            cache: 'reload'
          }}
          style={styles.postImage}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigateToProfile(item.user.id)}
        >
          <Image
            source={{
              uri: item.user.profile_picture_url || 'https://via.placeholder.com/40',
              cache: 'reload'
            }}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{item.user.name}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleLike(item)}
          style={styles.actionButton}
        >
          <Feather name="heart" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {item.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{item.caption}</Text>
        </View>
      )}
    </View>
  ), []);

  const handleScroll = Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const renderRefreshControl = () => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      progressViewOffset={HEADER_HEIGHT}
      tintColor={colors.primary}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
          <Text style={styles.headerTitle}>doggo</Text>
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item: Post) => item.id}
        refreshControl={renderRefreshControl()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={1}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubText}>Follow people to see their posts</Text>
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
        isOwner={selectedPost?.user.id === user?.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingTop: HEADER_HEIGHT,
  },
  postContainer: {
    marginBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  postImageContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
  },
  postImage: {
    width: SCREEN_WIDTH - (spacing.md * 2),
    height: 'auto',
    aspectRatio: 1,
    backgroundColor: colors.background,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.sm,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  actionButton: {
    padding: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: typography.title.fontSize,
    fontWeight: '300',
    letterSpacing: 1,
  },
  emptySubText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    fontWeight: '300',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  captionContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  caption: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
});

export default HomeScreen;
