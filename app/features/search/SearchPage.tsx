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
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList } from '@navigation/types';
import SearchBar from '@components/common/SearchBar';
import EmptyState from '@components/common/EmptyState';
import { supabase } from '@services/supabase';
import debounce from 'lodash.debounce';
import { AuthContext } from '@context/AuthContext';
import PhotoViewer from '@components/common/PhotoViewer';
import { colors, spacing } from '@styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getContactsStats } from '../../utils/contactsHelper';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const { width } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70;

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
  };
}

type ContactNetworkUser = {
  id: string; // This will be either profile_id (for registered users) or contact_id (for unregistered)
  name: string;
  username: string;
  profile_picture_url: string | null;
  phone_number?: string;
  connection_type: 'direct' | 'second_degree' | 'unregistered';
  clerk_id?: string | null;
  isRegistered: boolean;
};

// Define a proper type for search results from RPC
interface SearchResult {
  user_id: string;
  profile_id: string | null;
  username: string;
  name: string;
  profile_picture_url: string | null;
  clerk_id: string | null;
  connection_type: 'direct' | 'second_degree' | 'unregistered';
  contact_id: string;
  phone_number: string;
}

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const { user, checkContactsPermission } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [contactNetworkUsers, setContactNetworkUsers] = useState<ContactNetworkUser[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [contactsStats, setContactsStats] = useState<{ total: number; matched: number; hasImported?: boolean } | null>(null);

  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  useEffect(() => {
    fetchExplorePosts();
    checkContactsStatus();
  }, []);

  const checkContactsStatus = async () => {
    if (user) {
      try {
        const stats = await getContactsStats(user.id);
        setContactsStats(stats);

        // If contacts not imported, prompt for permission
        if (stats && !stats.hasImported) {
          const permissionGranted = await checkContactsPermission();
          if (permissionGranted) {
            // Refresh after import
            fetchExplorePosts();
          }
        }
      } catch (error) {
        console.error('Error checking contacts status:', error);
      }
    }
  };

  const fetchExplorePosts = async () => {
    try {
      setLoading(true);

      // Only fetch posts from user's direct contacts and 2nd-degree connections
      const { data, error } = await supabase.rpc('get_contact_network_posts', {
        limit_count: 20
      });

      if (error) {
        console.error('Error fetching posts:', error);
        // Fallback to simpler query if RPC fails (maybe it doesn't exist yet)
        const { data: fallbackData, error: fallbackError } = await supabase
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
              clerk_id
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fallbackError) throw fallbackError;

        if (fallbackData) {
          const postsWithValidUrls = fallbackData.map(post => ({
            id: post.id,
            url: post.url || '',
            caption: post.caption,
            created_at: post.created_at,
            user_id: post.user_id,
            user: {
              id: post.user?.id || '',
              name: post.user?.name || '',
              username: post.user?.username || '',
              profile_picture_url: post.user?.profile_picture_url || null,
              clerk_id: post.user?.clerk_id || ''
            }
          }));

          setExplorePosts(postsWithValidUrls);
        }
      } else {
        setExplorePosts(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching explore posts:', error);
      Alert.alert('Error', 'Failed to fetch posts from your network');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim() === '') {
        setContactNetworkUsers([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);

      try {
        // Get profile ID from storage if user context is not available
        const profileId = user?.id || await AsyncStorage.getItem('profile_id');

        // Validate profile ID before using it
        if (!profileId) {
          console.error('Search error: No valid profile ID available');
          setContactNetworkUsers([]);
          setSearchLoading(false);
          return;
        }

        // First try our new RPC function
        const { data: searchResults, error: searchError } = await supabase.rpc<SearchResult, any>(
          'search_contact_network',
          { search_term: searchQuery }
        );

        if (searchError) {
          console.error('Error with contact network search:', searchError);
          // Fallback method - search through contacts directly
          await fallbackSearch(searchQuery, profileId);
        } else if (searchResults) {
          // Process results from the RPC call
          const processedResults: ContactNetworkUser[] = searchResults.map((result: SearchResult) => ({
            id: result.profile_id || result.contact_id,
            name: result.name || 'Unknown',
            username: result.username || 'Not on doggo yet',
            profile_picture_url: result.profile_picture_url || null,
            phone_number: result.phone_number,
            connection_type: result.connection_type,
            clerk_id: result.clerk_id,
            isRegistered: result.profile_id !== null
          }));

          setContactNetworkUsers(processedResults);
        }
      } catch (err) {
        console.error('Search error:', err);
        setContactNetworkUsers([]);
        // Don't show alert to avoid disrupting UX for minor search errors
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    [user?.id]
  );

  const fallbackSearch = async (searchQuery: string, profileId: string) => {
    try {
      // Start with direct contacts who are on the app
      const { data: directContacts, error: directError } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone_number,
          contact_user_id,
          profiles:contact_user_id (
            id,
            name,
            username,
            profile_picture_url,
            clerk_id
          )
        `)
        .eq('user_id', profileId)
        .not('contact_user_id', 'is', null)
        .or(`name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
        .limit(10);

      if (directError) throw directError;

      // Get unregistered contacts
      const { data: unregisteredContacts, error: unregisteredError } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          phone_number
        `)
        .eq('user_id', profileId)
        .is('contact_user_id', null)
        .or(`name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
        .limit(10);

      if (unregisteredError) throw unregisteredError;

      // Combine results
      const combinedResults: ContactNetworkUser[] = [
        ...(directContacts || []).map(contact => ({
          id: contact.contact_user_id || contact.id,
          name: contact.profiles?.name || contact.name || 'Unknown',
          username: contact.profiles?.username || 'Unknown',
          profile_picture_url: contact.profiles?.profile_picture_url || null,
          phone_number: contact.phone_number,
          connection_type: 'direct' as const,
          clerk_id: contact.profiles?.clerk_id || null,
          isRegistered: true
        })),
        ...(unregisteredContacts || []).map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown Contact',
          username: 'Not on doggo yet',
          profile_picture_url: null,
          phone_number: contact.phone_number,
          connection_type: 'unregistered' as const,
          isRegistered: false
        }))
      ];

      setContactNetworkUsers(combinedResults);
    } catch (error) {
      console.error('Fallback search error:', error);
      setContactNetworkUsers([]);
    }
  };

  useEffect(() => {
    if (query) {
      performSearch(query);
    } else {
      setContactNetworkUsers([]);
    }
    return performSearch.cancel;
  }, [query, performSearch]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExplorePosts();
    checkContactsStatus();
  };

  const handleDeletePost = (postId: string) => {
    setExplorePosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  };

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
      if (!user?.clerk_id) {
        Alert.alert('Error', 'You must be logged in to like users.');
        return;
      }

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', user.clerk_id)
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
          liker_id: user.clerk_id,
          liked_id: userId
        }]);

      if (likeError) throw likeError;

      // Check if it's a mutual like
      const { data: mutualLike, error: mutualCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', userId)
        .eq('liked_id', user.clerk_id)
        .single();

      if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

      if (mutualLike) {
        // Create a match
        const { error: matchError } = await supabase
          .from('matches')
          .insert([{
            user1_id: user.id,
            user2_id: userId
          }]);

        if (matchError) throw matchError;

        // Create match notification
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: user.id,
              type: 'match',
              data: { matched_user_id: userId }
            },
            {
              user_id: userId,
              type: 'match',
              data: { matched_user_id: user.id }
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
            data: { liker_id: user.clerk_id }
          }]);

        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      }
    } catch (err) {
      console.error('Error liking user:', err);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    }
  };

  const handleLikeUnregistered = async (phone: string, name: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like users.');
      return;
    }

    try {
      // Get the current user's phone number
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!userProfile.phone) {
        Alert.alert('Error', 'You must have a phone number registered to like users.');
        return;
      }

      // Store the like in the database using phone numbers
      const { error: likeError } = await supabase
        .from('unregistered_likes')
        .insert([{
          liker_phone: userProfile.phone,
          liked_phone: phone,
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

  const renderUserItem = ({ item }: { item: ContactNetworkUser }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        if (item.isRegistered) {
          navigation.navigate('ProfileDetails', { userId: item.id });
        } else {
          Alert.alert(
            'Not on doggo yet',
            `${item.name} hasn't joined doggo yet. Would you like to invite them?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Invite',
                onPress: () => {
                  if (item.phone_number) {
                    handleLikeUnregistered(item.phone_number, item.name);
                  }
                },
                style: 'default'
              }
            ]
          );
        }
      }}
    >
      <Image
        source={item.profile_picture_url ? { uri: item.profile_picture_url } : require('@assets/images/Default_pfp.svg.png')}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userUsername}>
          {item.isRegistered ? `@${item.username}` : 'Not on doggo yet'}
        </Text>
        <Text style={styles.connectionType}>
          {item.connection_type === 'direct'
            ? 'Direct contact'
            : item.connection_type === 'second_degree'
              ? 'Friend of friend'
              : 'Contact'}
        </Text>
      </View>

      {/* Like button only for registered users */}
      {item.isRegistered && item.clerk_id && (
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLikeUser(item.clerk_id as string, item.name)}
        >
          <Text style={styles.likeButtonText}>Like</Text>
        </TouchableOpacity>
      )}

      {/* Invite button for unregistered users */}
      {!item.isRegistered && (
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => {
            if (item.phone_number) {
              handleLikeUnregistered(item.phone_number, item.name);
            }
          }}
        >
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderExplorePost = ({ item, index }: { item: Post; index: number }) => {
    const isEven = index % 2 === 0;
    const imageHeight = width * 0.5 * (1 + (isEven ? 0.2 : -0.2));

    return (
      <View style={styles.postContainer}>
        <TouchableOpacity
          style={styles.userHeader}
          onPress={() => {
            navigation.navigate('ProfileDetails', { userId: item.user.id });
          }}
        >
          <Image
            source={item.user.profile_picture_url ? { uri: item.user.profile_picture_url } : require('@assets/images/Default_pfp.svg.png')}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{item.user.name || item.user.username}</Text>
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

          {item.caption && (
            <View style={styles.captionContainer}>
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => {
    // If user has no contacts, show a different message
    if (contactsStats && contactsStats.total === 0) {
      return (
        <EmptyState
          message="No contacts found"
          description="To find friends, allow doggo to access your contacts"
          actionText="Import Contacts"
          onAction={() => checkContactsPermission()}
        />
      );
    }

    if (query) {
      return <EmptyState message="No users found matching your search" />;
    }

    return <EmptyState message="No posts to explore. Find friends to see their photos!" />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <SearchBar query={query} setQuery={setQuery} translateY={translateY} />

          <View style={styles.contentContainer}>
            {query ? (
              <FlatList
                data={contactNetworkUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                onScroll={onScroll}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                  searchLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  ) : (
                    renderEmptyState()
                  )
                }
              />
            ) : (
              <FlatList
                data={explorePosts}
                keyExtractor={(item) => item.id}
                renderItem={renderExplorePost}
                onScroll={onScroll}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                  loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  ) : (
                    renderEmptyState()
                  )
                }
              />
            )}
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

// Updated color values
const customColors = {
  ...colors,
  textTertiary: colors.textMuted,
  white: '#FFFFFF'
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
  contentContainer: {
    flex: 1,
    marginTop: SEARCH_BAR_HEIGHT,
    backgroundColor: colors.background,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  connectionType: {
    fontSize: 12,
    color: customColors.textTertiary,
    marginTop: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: colors.divider,
  },
  likeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: {
    color: customColors.white,
    fontWeight: '500',
    fontSize: 14,
  },
  inviteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteButtonText: {
    color: customColors.white,
    fontWeight: '500',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  postContainer: {
    marginBottom: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postImage: {
    width: width,
    height: width,
  },
  captionContainer: {
    padding: 12,
  },
  caption: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});

export default SearchPage;
