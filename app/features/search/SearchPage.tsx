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

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
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

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim() === '') {
        setFilteredUsers([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('name', `%${searchQuery}%`)
          .limit(20);

        if (error) throw error;
        setFilteredUsers(data as User[]);
      } catch (err) {
        console.error('Search error:', err);
        Alert.alert('Error', 'An unexpected error occurred during search.');
      }
    }, 300),
    []
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

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItemContainer}
      onPress={() => navigation.navigate('ProfileDetails', { userId: item.id })}
    >
      <Text style={styles.userNameText}>{item.name}</Text>
    </TouchableOpacity>
  );

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
    borderBottomColor: '#eee',
  },
  userNameText: {
    fontSize: 16,
    color: '#000',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postImage: {
    width: width,
    height: width,
  },
});

export default SearchPage;
