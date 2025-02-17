// app/features/home/screens/HomeScreen.tsx

import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  FlatList,
  Alert,
  SafeAreaView,
  Animated,
  Platform,
} from 'react-native';
import { supabase } from '@services/supabase';
import { User } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types';
import CustomHeader from '@components/common/CustomHeader';
import { AuthContext } from '@context/AuthContext';
import Feather from 'react-native-vector-icons/Feather';
import { colors, spacing, typography, layout, shadows } from '@styles/theme';
import PhotoViewer from '@components/common/PhotoViewer';
import { BlurView } from 'expo-blur';
import * as Contacts from 'expo-contacts';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

interface Post {
  id: string;
  url: string;
  created_at: string;
  caption?: string;
  user_id: string;
  user: User;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Fix typing for AnimatedFlatList
const AnimatedFlatList = Animated.createAnimatedComponent<{
  data: Post[];
  renderItem: ({ item }: { item: Post }) => React.ReactElement;
  keyExtractor: (item: Post) => string;
  refreshing: boolean;
  onRefresh: () => void;
  showsVerticalScrollIndicator: boolean;
  contentContainerStyle: any;
  onScroll: (event: any) => void;
  scrollEventThrottle: number;
  ListEmptyComponent: React.ReactElement;
}>(FlatList);

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = currentScrollY;

    if (direction === 'down') {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -44,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  };

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
      if (!user?.id) return;

      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get contacts first
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.id);

      if (contactsError) throw contactsError;

      const contactIds = contacts.map(c => c.contact_user_id);
      // Include user's own posts
      contactIds.push(user.id);

      // Fetch photos from contacts and the user
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          url,
          caption,
          created_at,
          user_id,
          user:profiles (*)
        `)
        .in('user_id', contactIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure we have valid URLs for all posts
      const postsWithValidUrls = (data || []).map(post => ({
        ...post,
        url: post.url || '',
      }));

      setPosts(postsWithValidUrls as Post[]);
    } catch (err) {
      console.error('Error fetching posts:', err);
      Alert.alert('Error', 'Failed to fetch posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPosts();
    }
  }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleDeletePost = (postId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  };

  const handleLike = async (post: Post) => {
    try {
      // Add to likes table
      const { error } = await supabase
        .from('likes')
        .insert([{
          liker_id: user?.id,
          liked_id: post.user.id
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error liking post:', err);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const navigateToProfile = (userId: string) => {
    navigation.navigate('ProfileDetails', { userId });
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <TouchableOpacity
        style={styles.postHeader}
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
        activeOpacity={0.9}
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
          resizeMode="cover"
        />
      </TouchableOpacity>

      {item.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{item.caption}</Text>
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity
          onPress={() => handleLike(item)}
          style={styles.actionButton}
        >
          <Feather name="heart" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
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
      <CustomHeader translateY={translateY} opacity={opacity} />
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContainer, { paddingTop: 44 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
    paddingTop: spacing.sm,
  },
  postContainer: {
    marginBottom: spacing.xl,
    backgroundColor: colors.background,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.surface,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
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
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  caption: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
  },
});

export default HomeScreen;
