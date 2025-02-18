// app/features/search/SearchPage.tsx

import React, { useState, useRef, useCallback, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Text,
  Keyboard,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList, User } from '@navigation/types';
import SearchBar from '@components/common/SearchBar';
import EmptyState from '@components/common/EmptyState';
import PhotoCarousel from '@components/common/PhotoCarousel';
import { supabase } from '@services/supabase';
import debounce from 'lodash.debounce';
import { AuthContext } from '@context/AuthContext';
import PhotoViewer from '@components/common/PhotoViewer';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, layout } from '@styles/theme';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const { width } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70;

interface Post {
  id: string;
  url: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    name: string;
    username: string;
    profile_picture_url?: string;
  };
}

interface ExtendedUser extends UserWithPhotos {
  isRegistered: boolean;
  is_placeholder?: boolean;
}

interface UnregisteredContact {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface UserWithPhotos extends User {
  photos?: Photo[];
}

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ExtendedUser[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  useEffect(() => {
    fetchExplorePosts();
  }, []);

  const fetchExplorePosts = async () => {
    try {
      if (!user?.id) return;

      // Step 1: Get immediate contacts
      const { data: immediateContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.id);

      if (contactsError) throw contactsError;

      const immediateContactIds = immediateContacts.map(contact => contact.contact_user_id);

      // Step 2: Get contacts of contacts
      const { data: contactsOfContacts, error: cocError } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .in('user_id', immediateContactIds)
        .neq('contact_user_id', user.id)
        .not('contact_user_id', 'in', `(${immediateContactIds.join(',')})`);

      if (cocError) throw cocError;

      const contactsOfContactIds = [...new Set(contactsOfContacts.map(c => c.contact_user_id))];

      // Step 3: Get photos from contacts of contacts
      const { data: photos, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          url,
          caption,
          created_at,
          user_id,
          user:profiles (
            id,
            name,
            username,
            profile_picture_url
          )
        `)
        .in('user_id', contactsOfContactIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (photosError) throw photosError;

      setExplorePosts(photos as unknown as Post[]);
    } catch (error: any) {
      console.error('Error fetching explore posts:', error);
      Alert.alert('Error', 'Failed to fetch explore posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExplorePosts();
  };

  const handleDeletePost = (postId: string) => {
    setExplorePosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  };

  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim() === '') {
        setFilteredUsers([]);
        return;
      }

      try {
        // Search registered users
        const { data: registeredUsers, error: registeredError } = await supabase
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
          .ilike('name', `%${searchQuery}%`)
          .limit(20);

        if (registeredError) throw registeredError;

        // Search unregistered contacts
        const { data: unregisteredContacts, error: unregisteredError } = await supabase
          .from('unregistered_contacts')
          .select('*')
          .eq('user_id', user?.id)
          .ilike('name', `%${searchQuery}%`)
          .limit(20);

        if (unregisteredError) throw unregisteredError;

        // Preload images for registered users
        if (registeredUsers) {
          (registeredUsers as UserWithPhotos[]).forEach(async (user) => {
            if (user.profile_picture_url) {
              await Image.prefetch(user.profile_picture_url);
            }
            // Preload first few photos if available
            if (user.photos) {
              const photosToPreload = user.photos.slice(0, 3);
              await Promise.all(photosToPreload.map(photo => Image.prefetch(photo.url)));
            }
          });
        }

        // Combine results
        const combinedResults: ExtendedUser[] = [
          ...((registeredUsers as UserWithPhotos[]) || []).map(user => ({
            ...user,
            isRegistered: true,
            profile_picture_url: user.profile_picture_url || 'https://via.placeholder.com/40'
          })),
          ...((unregisteredContacts as UnregisteredContact[]) || []).map(contact => ({
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            username: 'Not on doggo',
            profile_picture_url: 'https://via.placeholder.com/40',
            isRegistered: false,
            is_placeholder: true,
            created_at: contact.created_at,
            updated_at: contact.updated_at
          }))
        ];

        setFilteredUsers(combinedResults);
      } catch (err) {
        console.error('Search error:', err);
        Alert.alert('Error', 'An unexpected error occurred during search.');
      }
    }, 300),
    [user?.id]
  );

  useEffect(() => {
    performSearch(query);
    return performSearch.cancel;
  }, [query, performSearch]);

  // Animate search bar hide/show on scroll
  const onScroll = useCallback(
    (event: any) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
      lastScrollY.current = currentScrollY;

      Animated.timing(translateY, {
        toValue: direction === 'down' ? -SEARCH_BAR_HEIGHT : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [translateY]
  );

  const handleLikeUser = async (userId: string, name: string) => {
    try {
      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', user?.id)
        .eq('liked_id', userId)
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
          liker_id: user?.id,
          liked_id: userId
        }]);

      if (likeError) throw likeError;

      // Check if it's a mutual like
      const { data: mutualLike, error: mutualCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', userId)
        .eq('liked_id', user?.id)
        .single();

      if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

      if (mutualLike) {
        // Create a match
        const { error: matchError } = await supabase
          .from('matches')
          .insert([{
            user1_id: user?.id,
            user2_id: userId
          }]);

        if (matchError) throw matchError;

        // Create match notification
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: user?.id,
              type: 'match',
              data: { matched_user_id: userId }
            },
            {
              user_id: userId,
              type: 'match',
              data: { matched_user_id: user?.id }
            }
          ]);

        Alert.alert('Match!', `You and ${name} have liked each other!`);
      } else {
        // Create like notification
        await supabase
          .from('notifications')
          .insert([{
            user_id: userId,
            type: 'like',
            data: { liker_id: user?.id }
          }]);

        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      }
    } catch (err) {
      console.error('Error liking user:', err);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    }
  };

  const renderUserItem = ({ item }: { item: ExtendedUser }) => {
    if (item.isRegistered) {
      return (
        <View style={styles.userItemContainer}>
          <TouchableOpacity
            style={styles.userInfoContainer}
            onPress={() => navigation.navigate('ProfileDetails', { userId: item.id })}
          >
            <Image
              source={{ uri: item.profile_picture_url || 'https://via.placeholder.com/40' }}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userNameText}>{item.name}</Text>
              <Text style={styles.usernameText}>@{item.username}</Text>
            </View>
          </TouchableOpacity>

          {item.id !== user?.id && (
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleLikeUser(item.id, item.name)}
            >
              <Feather name="heart" size={20} color={colors.primary} />
              <Text style={styles.likeButtonText}>Like</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (!item.phone) {
      return (
        <View style={styles.userItemContainer}>
          <View style={styles.userInfo}>
            <Text style={styles.userNameText}>{item.name}</Text>
            <Text style={styles.unregisteredText}>Phone number not available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.userItemContainer}>
        <View style={styles.userInfo}>
          <Text style={styles.userNameText}>{item.name}</Text>
          <Text style={styles.unregisteredText}>Not on doggo yet</Text>
        </View>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLikeUnregistered(item.phone, item.name)}
        >
          <Feather name="heart" size={20} color={colors.primary} />
          <Text style={styles.likeButtonText}>Like</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderExplorePost = ({ item, index }: { item: Post; index: number }) => {
    const isEven = index % 2 === 0;
    const imageHeight = width * 0.5 * (1 + (isEven ? 0.2 : -0.2));

    return (
      <View style={styles.postContainer}>
        <TouchableOpacity
          style={styles.userHeader}
          onPress={() => navigation.navigate('ProfileDetails', { userId: item.user.id })}
        >
          <Image
            source={{ uri: item.user.profile_picture_url || 'https://via.placeholder.com/40' }}
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
            source={{ uri: item.url }}
            style={[styles.postImage, { height: imageHeight }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (query) {
      return (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={<EmptyState message="No users found" />}
        />
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    return (
      <FlatList
        data={explorePosts}
        keyExtractor={(item) => item.id}
        renderItem={renderExplorePost}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState message="No posts to explore" />
        }
      />
    );
  };

  const handleLikeUnregistered = async (phone: string, name: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like users.');
      return;
    }

    try {
      // Store the like in the database
      const { error: likeError } = await supabase
        .from('unregistered_likes')
        .insert([{
          user_id: user.id,
          phone,
          created_at: new Date().toISOString()
        }]);

      if (likeError) throw likeError;

      // Send SMS invite
      const { data: response, error: smsError } = await supabase.functions.invoke('send-invite', {
        body: { phone, fromUserName: user.name || 'Someone' }
      });

      if (smsError) {
        console.error('Error sending invite:', smsError);
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
        return;
      }

      if (response?.success) {
        Alert.alert('Success', `Liked and invited ${name} to join doggo!`);
      } else {
        Alert.alert('Partial Success', 'Like recorded but failed to send invite message.');
      }
    } catch (err) {
      console.error('Error liking unregistered user:', err);
      Alert.alert('Error', 'Failed to send like. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <SearchBar query={query} setQuery={setQuery} translateY={translateY} />
          <View style={[styles.contentContainer, { marginTop: 0 }]}>
            {renderContent()}
          </View>

          <PhotoViewer
            visible={photoViewerVisible}
            photo={selectedPost}
            onClose={() => {
              setPhotoViewerVisible(false);
              setSelectedPost(null);
            }}
            onDelete={handleDeletePost}
            isOwner={selectedPost?.user_id === user?.id}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    marginTop: SEARCH_BAR_HEIGHT,
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  usernameText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unregisteredText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  likeButtonText: {
    color: colors.primary,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postContainer: {
    marginBottom: 20,
  },
  userHeader: {
    padding: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  postImage: {
    width: width,
    height: width,
  },
});

export default SearchPage;
