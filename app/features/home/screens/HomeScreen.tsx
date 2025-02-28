// app/features/home/screens/HomeScreen.tsx

import React, { useEffect, useState, useContext, useRef, useCallback, useMemo } from 'react';
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
  Button,
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
import { useApp } from '@context/AppContext';
import { useAuth } from '@clerk/clerk-expo';
import { debounce } from 'lodash';

// Constants moved to the top
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
const HEADER_HEIGHT = 60;
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + STATUS_BAR_HEIGHT;

// Types
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

// Debug Overlay Component - Defined outside the main component
interface DebugOverlayProps {
  getAuthStateDisplay: () => string;
  loading: boolean;
  loadingStage: string;
  posts: Post[];
  user: User | null;
  profile: any;
  debouncedLogDebugInfo: () => void;
  setLoadingStage: React.Dispatch<React.SetStateAction<string>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  fetchPosts: (forceRefresh?: boolean) => Promise<void>;
}

const DebugOverlayComponent = ({
  getAuthStateDisplay,
  loading,
  loadingStage,
  posts,
  user,
  profile,
  debouncedLogDebugInfo,
  setLoadingStage,
  setLoading,
  fetchPosts
}: DebugOverlayProps) => {
  // Add a ref to track last update time
  const lastUpdateRef = useRef(Date.now());
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [localDebugInfo, setLocalDebugInfo] = useState({
    auth: getAuthStateDisplay(),
    loading: loading ? 'Yes' : 'No',
    stage: loadingStage,
    posts: posts.length.toString(),
    user: user ? user.username : 'None',
    profile: profile ? profile.username : 'None',
    clerkId: profile?.clerk_id || 'None'
  });

  // Reformat the debug info for display
  const resetLoading = () => {
    setLoadingStage('Ready');
    debouncedLogDebugInfo();
  };

  // This will manually refresh content
  const refreshContent = async () => {
    setLoading(true);
    setLoadingStage('Manual refresh...');
    await fetchPosts(true);
    setLoading(false);
    setLoadingStage('Ready');
    debouncedLogDebugInfo();
  };

  // Only update the debug UI at most once every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      // Only update if it's been more than 5 seconds
      if (Date.now() - lastUpdateRef.current > 5000) {
        lastUpdateRef.current = Date.now();
        setLastUpdate(Date.now());
        setLocalDebugInfo({
          auth: getAuthStateDisplay(),
          loading: loading ? 'Yes' : 'No',
          stage: loadingStage,
          posts: posts.length.toString(),
          user: user ? user.username : 'None',
          profile: profile ? profile.username : 'None',
          clerkId: profile?.clerk_id || 'None'
        });
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [getAuthStateDisplay, loading, loadingStage, posts.length, user, profile]);

  return (
    <View style={styles.debugOverlay}>
      <Text style={styles.debugTitle}>DEBUG INFO</Text>
      <Text style={styles.debugText}>Auth: {localDebugInfo.auth}</Text>
      <Text style={styles.debugText}>Loading: {localDebugInfo.loading}</Text>
      <Text style={styles.debugText}>Stage: {localDebugInfo.stage}</Text>
      <Text style={styles.debugText}>Posts: {localDebugInfo.posts}</Text>
      <Text style={styles.debugText}>User: {localDebugInfo.user}</Text>
      <Text style={styles.debugText}>Profile: {localDebugInfo.profile}</Text>
      <Text style={styles.debugText}>Clerk ID: {localDebugInfo.clerkId}</Text>
      <Text style={styles.debugText}>Last Update: {new Date(lastUpdate).toLocaleTimeString()}</Text>
      <View style={styles.debugButtons}>
        <TouchableOpacity style={styles.debugButton} onPress={resetLoading}>
          <Text style={styles.debugButtonText}>Reset Stage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.debugButton} onPress={refreshContent}>
          <Text style={styles.debugButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Create animated component outside of render
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList
) as React.ComponentType<FlatListProps<Post>>;

// Main component
const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useContext(AuthContext);
  const { state: { profile } } = useApp();
  const { userId, isSignedIn } = useAuth();

  // Define all state hooks at the top level of the component
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [preloadedProfiles, setPreloadedProfiles] = useState<Set<string>>(new Set());
  const [debugMessage, setDebugMessage] = useState<string>('');
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Define refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const didInitializeRef = useRef(false);

  // Define viewability configuration first
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

  // First define all callback functions needed by other hooks
  const getAuthStateDisplay = useCallback(() => {
    if (profile?.id) {
      return `Authenticated as: ${profile.username || profile.id}`;
    }
    return 'Not authenticated';
  }, [profile?.id, profile?.username]);

  // Define handleRefresh first
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPosts(true); // We'll define fetchPosts below
    } catch (error) {
      console.error('Error refreshing posts:', error);
    } finally {
      setRefreshing(false);
    }
  }, []); // Empty dependency array initially

  // Define handleDeletePost before it's used in other components
  const handleDeletePost = useCallback((postId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  }, []);

  // Forward declare fetchPosts
  const fetchPosts = async (forceRefresh = false) => {
    try {
      if (!forceRefresh && (loading && posts.length > 0)) {
        console.log('Skipping fetchPosts - already loading with existing posts');
        return; // Already loading with existing posts
      }

      // Don't set loading if we're just refreshing
      if (!refreshing) {
        setLoadingStage('Fetching posts...');
        setLoading(true);
      }

      // Get profile ID from AsyncStorage if not available from context
      let profileId = profile?.id;
      if (!profileId) {
        const storedProfileId = await AsyncStorage.getItem('profile_id');
        profileId = storedProfileId || undefined;

        if (profileId) {
          console.log('Using profile ID from AsyncStorage:', profileId);
          // Store authentication state for other components to use
          await AsyncStorage.setItem('is_authenticated', 'true');
        }
      } else {
        // Ensure we store the authenticated state when we have a profile
        await AsyncStorage.setItem('is_authenticated', 'true');
      }

      // Even if we don't have a profile ID, we should still fetch posts
      // This ensures content loads even if auth isn't ready
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

      if (error) {
        console.error('Error fetching posts:', error);
        setLoadingStage(`Error: ${error.message || 'Unknown error'}`);
        setErrorMessage('Failed to load posts. Pull down to retry.');
        return; // Return instead of throwing to prevent cascading errors
      }

      // Ensure we have valid URLs for all posts
      const postsWithValidUrls = (data || []).map(post => ({
        id: post.id,
        url: post.url || '',
        caption: post.caption,
        created_at: post.created_at,
        user_id: post.user_id,
        user: {
          id: post.user.id,
          name: post.user.name || 'Unknown',
          username: post.user.username || 'user',
          profile_picture_url: post.user.profile_picture_url || null,
          clerk_id: post.user.clerk_id || '',
          likes: post.user.likes || 0
        }
      }));

      console.log(`Fetched ${postsWithValidUrls.length} posts`);
      setPosts(postsWithValidUrls);
      setLoadingStage('Posts loaded');
      setErrorMessage(null); // Clear any previous errors

    } catch (error: any) {
      console.error('Error fetching posts:', error);
      setLoadingStage(`Error: ${error?.message || 'Unknown error'}`);
      setErrorMessage('Failed to load posts. Pull down to retry.');
    } finally {
      // Only update loading state if we're not refreshing
      if (!refreshing) {
        setLoading(false);
      }
    }
  };

  // Update handleRefresh dependency to include fetchPosts
  handleRefresh.dependencies = [fetchPosts];

  // Define all animation-related hooks
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

  // Define handleScroll
  const handleScroll = useMemo(() => {
    return Animated.event<NativeSyntheticEvent<NativeScrollEvent>>(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      { useNativeDriver: true }
    );
  }, [scrollY]);

  // Define renderRefreshControl
  const memoizedRenderRefreshControl = useMemo(() => {
    return (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        progressViewOffset={HEADER_HEIGHT}
        tintColor={colors.primary}
      />
    );
  }, [refreshing, handleRefresh]);

  // Define navigateToProfile before it's used in preloadProfile
  const navigateToProfile = useCallback((userId: string) => {
    // If it's the current user's profile, navigate directly to the Profile tab
    if (user?.id === userId) {
      // @ts-ignore - Navigating to root tab
      navigation.navigate('Profile');
    } else {
      // If it's another user's profile, navigate to their ProfileDetails
      navigation.navigate('ProfileDetails', { userId });
    }
  }, [navigation, user?.id]);

  // Helper function for contacts and permissions
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

  // Pre-declare preloadProfile before it's used in onViewableItemsChanged
  const preloadProfile = useCallback(async (userId: string) => {
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
  }, [preloadedProfiles]);

  // Define onViewableItemsChanged using the pre-declared preloadProfile
  const onViewableItemsChanged = useCallback(({ viewableItems }: {
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
  }, [preloadProfile]);

  // Set up viewability config pairs after onViewableItemsChanged is defined
  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged }
  ]);

  // Define handleLike
  const handleLike = useCallback(async (post: Post) => {
    try {
      if (!user?.clerk_id) return;

      const { error: likeError } = await supabase
        .from('likes')
        .insert([
          {
            liker_id: user.clerk_id,
            liked_id: post.user.clerk_id,
            created_at: new Date().toISOString()
          }
        ]);

      if (likeError) throw likeError;

      // Optimistically update UI
      setPosts(currentPosts =>
        currentPosts.map(p =>
          p.id === post.id
            ? { ...p, user: { ...p.user, likes: (p.user.likes || 0) + 1 } }
            : p
        )
      );

    } catch (error: any) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  }, [user?.clerk_id]);

  // Define logDebugInfo
  const logDebugInfo = useCallback(() => {
    // Create a snapshot of current state for logging
    const authState = getAuthStateDisplay();
    const stateSnapshot = {
      'Auth': authState,
      'Loading': loading ? 'Yes' : 'No',
      'Stage': loadingStage,
      'Posts': posts.length,
      'User': user ? user.username : 'None',
      'Profile': profile ? profile.username : 'None',
      'Clerk ID': profile?.clerk_id || 'None',
    };

    console.log('===== DEBUG STATE =====');
    Object.entries(stateSnapshot).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
    console.log('=======================');
  }, [getAuthStateDisplay, loading, loadingStage, posts.length, user, profile]);

  // Debounced version of logDebugInfo
  const debouncedLogDebugInfo = useMemo(
    () => debounce(logDebugInfo, 2000, { leading: true, trailing: true }),
    [logDebugInfo]
  );

  // Toggle debug display
  const toggleDebug = useCallback(() => {
    setShowDebug(prevState => {
      const newState = !prevState;
      if (newState) {
        // Log debug info when turning on the overlay
        debouncedLogDebugInfo();
      }
      return newState;
    });
  }, [debouncedLogDebugInfo]);

  // Helper for cached profile ID
  const checkCachedProfileId = useCallback(async (): Promise<string | undefined> => {
    try {
      const cachedProfileId = await AsyncStorage.getItem('profile_id');
      if (cachedProfileId) {
        console.log('Found cached profile ID:', cachedProfileId);
        return cachedProfileId;
      }
      return undefined;
    } catch (error) {
      console.error('Error checking cached profile ID:', error);
      return undefined;
    }
  }, []);

  // Check and request image permissions
  const checkAndRequestImagePermissions = useCallback(async () => {
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
  }, []);

  // Define renderPost after all its dependencies
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
  ), [navigateToProfile, handleLike]);

  // Memoize the ListEmptyComponent
  const ListEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : errorMessage ? (
        <View>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleRefresh()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.emptyText}>No posts yet</Text>
      )}
    </View>
  ), [loading, errorMessage, handleRefresh]);

  // Initialize app - using useEffect with empty dependency array
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Only initialize once
        if (didInitializeRef.current) {
          console.log('App already initialized, skipping');
          return;
        }

        console.log('Initializing app...');
        didInitializeRef.current = true;

        if (!loading && posts.length > 0) {
          // If we have posts and we're not loading, we're ready
          console.log('Already have posts, marking as ready');
          setLoadingStage('Ready');
          return;
        }

        if (profile?.id) {
          console.log('Home: Profile available, proceeding with init');
          setLoadingStage('Fetching posts');
          await fetchPosts();
        } else {
          const storedProfileId = await checkCachedProfileId();
          if (storedProfileId) {
            console.log('Home: Using cached profile ID');
            setLoadingStage('Fetching posts with cached ID');
            await fetchPosts();
          } else {
            console.log('Home: No profile available, fetching posts anyway');
            await fetchPosts();
          }
        }

        setLoadingStage('Ready');
      } catch (error) {
        console.error('Error initializing app:', error);
        setLoadingStage('Error during initialization');
      } finally {
        // Always exit loading state after initialization
        setLoading(false);
      }
    };

    initializeApp();

    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('Home screen timeout - forcing exit from loading state');
        setLoading(false);
        setLoadingStage('Timed out');
      }
    }, 15000); // Increased timeout to 15 seconds

    return () => clearTimeout(timeout);
  }, []); // Empty dependency array means this only runs once on mount

  // Effect for auth state changes
  useEffect(() => {
    // Update loading stage when profile is available
    if (profile?.id || (posts.length > 0 && loading === false)) {
      setLoadingStage('Ready');
    }

    // Only log changes when debug is enabled
    if (showDebug) {
      debouncedLogDebugInfo();
    }

    // If we just got user/profile and have no posts, fetch them
    if ((user?.id || profile?.id || userId) && posts.length === 0 && !loading) {
      fetchPosts();
    }

    // Set up a timer to periodically check auth state
    // This is more efficient than relying on dependency changes
    const authCheckTimer = setInterval(() => {
      // Only check if we're not already loading
      if (!loading && showDebug) {
        debouncedLogDebugInfo();
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(authCheckTimer);
  }, [user?.id, profile?.id, userId, isSignedIn, showDebug, debouncedLogDebugInfo, posts.length, loading, fetchPosts]);

  // Render
  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{loadingStage}</Text>
        {showDebug && (
          <DebugOverlayComponent
            getAuthStateDisplay={getAuthStateDisplay}
            loading={loading}
            loadingStage={loadingStage}
            posts={posts}
            user={user}
            profile={profile}
            debouncedLogDebugInfo={debouncedLogDebugInfo}
            setLoadingStage={setLoadingStage}
            setLoading={setLoading}
            fetchPosts={fetchPosts}
          />
        )}
      </SafeAreaView>
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
          <TouchableOpacity onPress={toggleDebug} style={styles.debugButton}>
            <Text style={styles.debugButtonText}>Debug</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <AnimatedFlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item: Post) => item.id}
        refreshControl={memoizedRenderRefreshControl}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer]}
        onScroll={handleScroll}
        scrollEventThrottle={1}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        ListEmptyComponent={ListEmptyComponent}
        removeClippedSubviews={true} // Optimize memory usage
        maxToRenderPerBatch={5} // Limit number of items rendered per batch
        windowSize={7} // Reduce the number of items rendered outside of the visible area
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

      {showDebug && (
        <DebugOverlayComponent
          getAuthStateDisplay={getAuthStateDisplay}
          loading={loading}
          loadingStage={loadingStage}
          posts={posts}
          user={user}
          profile={profile}
          debouncedLogDebugInfo={debouncedLogDebugInfo}
          setLoadingStage={setLoadingStage}
          setLoading={setLoading}
          fetchPosts={fetchPosts}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
    maxWidth: '80%',
    zIndex: 1000,
  },
  debugTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  debugButton: {
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  debugButtonText: {
    color: colors.primary,
    fontSize: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.body.fontSize,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: layout.borderRadius.md,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: '500',
  },
});

export default HomeScreen;
