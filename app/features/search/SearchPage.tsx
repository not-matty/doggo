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
import { useClerkAuthContext, Profile } from '@context/ClerkAuthContext';
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
    id: string; // profiles.id (UUID)
    name: string;
    username: string;
    profile_picture_url?: string | null;
  };
}

type ContactNetworkUser = {
  id: string; // This will be either profile_id (for registered users) or contact_id (for unregistered)
  name: string;
  username: string;
  profile_picture_url: string | null;
  phone_number?: string;
  connection_type: 'direct' | 'second_degree' | 'unregistered';
  isRegistered: boolean;
};

// Define a proper type for search results from RPC
interface SearchResult {
  id: string; // UUID from profiles.id
  name: string;
  username: string | null;
  profile_picture_url: string | null;
  phone_number: string | null;
  is_registered: boolean;
  is_contact: boolean;
  connection_type: string;
}

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  // Use both contexts for now, prioritizing the Clerk one
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();

  // Choose which auth context to use
  const contextUser = clerkAuthContext?.user || authContext?.user;
  const checkContactsPermission = clerkAuthContext?.checkContactsPermission || authContext?.checkContactsPermission;

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
    if (contextUser) {
      try {
        const stats = await getContactsStats(contextUser.id);
        setContactsStats(stats);

        // If contacts not imported, prompt for permission
        if (stats && !stats.hasImported && checkContactsPermission) {
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
              profile_picture_url
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
              id: post.user?.[0]?.id || '',
              name: post.user?.[0]?.name || '',
              username: post.user?.[0]?.username || '',
              profile_picture_url: post.user?.[0]?.profile_picture_url || null
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
      console.log('Performing search with query:', searchQuery);

      try {
        // Get profile ID from storage if user context is not available
        const profileId = contextUser?.id || await AsyncStorage.getItem('profile_id');

        // Validate profile ID before using it
        if (!profileId) {
          console.error('Search error: No valid profile ID available');
          setContactNetworkUsers([]);
          setSearchLoading(false);
          return;
        }

        console.log('Searching with profile ID:', profileId);

        // Use search_contacts_and_profiles which returns both registered and unregistered contacts
        const { data: searchResults, error: searchError } = await supabase.rpc(
          'search_contacts_and_profiles',
          {
            search_term: searchQuery,
            current_user_id: profileId
          }
        );

        if (searchError) {
          console.error('Error with search_contacts_and_profiles RPC:', searchError);
          // Fallback method - search through contacts directly
          await fallbackSearch(searchQuery, profileId);
        } else if (searchResults && searchResults.length > 0) {
          console.log(`Found ${searchResults.length} results with search_contacts_and_profiles`);

          // Process results from search_contacts_and_profiles
          const processedResults: ContactNetworkUser[] = searchResults.map((result: SearchResult) => ({
            id: result.id, // This is profiles.id (UUID)
            name: result.name || 'Unknown',
            username: result.username || 'Not on doggo yet',
            profile_picture_url: result.profile_picture_url || null,
            phone_number: result.phone_number || null,
            connection_type: result.connection_type as 'direct' | 'second_degree' | 'unregistered',
            isRegistered: result.is_registered
          }));

          // Sort results: Registered users first, then by connection type
          const sortedResults = processedResults.sort((a, b) => {
            // First prioritize registered vs unregistered
            if (a.isRegistered && !b.isRegistered) return -1;
            if (!a.isRegistered && b.isRegistered) return 1;

            // Then prioritize by connection type
            const connectionOrder = {
              'direct': 0,
              'second_degree': 1,
              'unregistered': 2,
              'network': 3
            };

            const aOrder = connectionOrder[a.connection_type] || 999;
            const bOrder = connectionOrder[b.connection_type] || 999;

            return aOrder - bOrder;
          });

          setContactNetworkUsers(sortedResults);
        } else {
          console.log('No search results found, trying fallback search');
          await fallbackSearch(searchQuery, profileId);
        }
      } catch (err) {
        console.error('Search error:', err);
        setContactNetworkUsers([]);
      }
      setSearchLoading(false);
    }, 300),
    [contextUser?.id]
  );

  const fallbackSearch = async (searchQuery: string, profileId: string) => {
    console.log('Using fallback search with query:', searchQuery);
    try {
      // --- SEARCH FOR UNREGISTERED CONTACTS FIRST ---
      // This is a key improvement to ensure we find unregistered contacts
      console.log('Searching for unregistered contacts in contacts table');
      const { data: unregisteredContacts, error: unregisteredError } = await supabase
        .from('contacts')
        .select(`
          id,
          phone_number,
          name
        `)
        .eq('owner_id', profileId)
        .is('contact_user_id', null)
        .or(`phone_number.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(20);

      if (unregisteredError) {
        console.error('Error fetching unregistered contacts:', unregisteredError);
      } else {
        console.log(`Found ${unregisteredContacts?.length || 0} unregistered contacts`);
      }

      // Also try the unregistered_contacts table
      console.log('Searching in unregistered_contacts table');
      const { data: extraUnregisteredContacts, error: extraUnregisteredError } = await supabase
        .from('unregistered_contacts')
        .select(`
          id,
          phone,
          name
        `)
        .eq('user_id', profileId)
        .or(`phone.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
        .limit(20);

      if (extraUnregisteredError) {
        console.error('Error fetching from unregistered_contacts table:', extraUnregisteredError);
      } else {
        console.log(`Found ${extraUnregisteredContacts?.length || 0} contacts in unregistered_contacts table`);
      }

      // --- SEARCH FOR REGISTERED CONTACTS ---
      console.log('Searching for registered contacts');
      // Start with direct contacts who are on the app
      const { data: directContacts, error: directError } = await supabase
        .from('contacts')
        .select(`
          id,
          phone_number,
          owner_id,
          contact_user_id,
          profiles:contact_user_id (
            id,
            name,
            username,
            profile_picture_url
          )
        `)
        .eq('owner_id', profileId)
        .not('contact_user_id', 'is', null)
        .filter('phone_number', 'ilike', `%${searchQuery}%`)
        .limit(10);

      if (directError) {
        console.error('Error fetching direct contacts by phone:', directError);
      } else {
        console.log(`Found ${directContacts?.length || 0} direct contacts by phone number`);
      }

      // Search for direct contacts by name or username
      const { data: directContactsByName, error: directNameError } = await supabase
        .from('contacts')
        .select(`
          id,
          phone_number,
          owner_id,
          contact_user_id,
          profiles!contact_user_id (
            id,
            name,
            username,
            profile_picture_url
          )
        `)
        .eq('owner_id', profileId)
        .not('contact_user_id', 'is', null)
        .or(`profiles.name.ilike.%${searchQuery}%,profiles.username.ilike.%${searchQuery}%`)
        .limit(10);

      if (directNameError) {
        console.error('Error searching contacts by name:', directNameError);
      } else {
        console.log(`Found ${directContactsByName?.length || 0} direct contacts by name`);
      }

      // Combine all results
      const combinedResults: ContactNetworkUser[] = [
        // Process direct contacts
        ...(directContacts || []).map(contact => ({
          id: contact.profiles?.[0]?.id || contact.id,
          name: contact.profiles?.[0]?.name || 'Contact',
          username: contact.profiles?.[0]?.username || 'Unknown',
          profile_picture_url: contact.profiles?.[0]?.profile_picture_url || null,
          phone_number: contact.phone_number,
          connection_type: 'direct' as const,
          isRegistered: true
        })),

        // Process direct contacts by name
        ...(directContactsByName || []).map(contact => ({
          id: contact.profiles?.[0]?.id || contact.id,
          name: contact.profiles?.[0]?.name || 'Contact',
          username: contact.profiles?.[0]?.username || 'Unknown',
          profile_picture_url: contact.profiles?.[0]?.profile_picture_url || null,
          phone_number: contact.phone_number,
          connection_type: 'direct' as const,
          isRegistered: true
        })),

        // Process unregistered contacts from contacts table
        ...(unregisteredContacts || []).map(contact => ({
          id: contact.id,
          name: contact.name || `Contact: ${contact.phone_number}`,
          username: 'Not on doggo yet',
          profile_picture_url: null,
          phone_number: contact.phone_number,
          connection_type: 'unregistered' as const,
          isRegistered: false
        })),

        // Process unregistered contacts from unregistered_contacts table
        ...(extraUnregisteredContacts || []).map(contact => ({
          id: contact.id,
          name: contact.name || `Contact: ${contact.phone}`,
          username: 'Not on doggo yet',
          profile_picture_url: null,
          phone_number: contact.phone,
          connection_type: 'unregistered' as const,
          isRegistered: false
        }))
      ];

      // Remove duplicates
      const uniqueResults = Array.from(new Map(
        combinedResults.map(item => [item.id, item])
      ).values());

      console.log(`Fallback search found ${uniqueResults.length} total unique results`);
      setContactNetworkUsers(uniqueResults);
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
      if (!contextUser?.id) {
        Alert.alert('Error', 'You must be logged in to like users.');
        return;
      }

      // Check if already liked
      const { data: existingLike, error: checkError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', contextUser.id)
        .eq('liked_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingLike) {
        // Unlike the user
        const { error: unlikeError } = await supabase
          .from('likes')
          .delete()
          .eq('liker_id', contextUser.id)
          .eq('liked_id', userId);

        if (unlikeError) throw unlikeError;

        Alert.alert('Unliked', `You have unliked ${name}.`);
        return;
      }

      // Add the like
      const { error: likeError } = await supabase
        .from('likes')
        .insert([{
          liker_id: contextUser.id,
          liked_id: userId
        }]);

      if (likeError) throw likeError;

      // Check if it's a mutual like
      const { data: mutualLike, error: mutualCheckError } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', userId)
        .eq('liked_id', contextUser.id)
        .single();

      if (mutualCheckError && mutualCheckError.code !== 'PGRST116') throw mutualCheckError;

      if (mutualLike) {
        // Create a match
        const { error: matchError } = await supabase
          .from('matches')
          .insert([{
            user1_id: contextUser.id,
            user2_id: userId
          }]);

        if (matchError) throw matchError;

        // Create match notification
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: contextUser.id,
              type: 'match',
              data: { matched_user_id: userId }
            },
            {
              user_id: userId,
              type: 'match',
              data: { matched_user_id: contextUser.id }
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
            data: { liker_id: contextUser.id }
          }]);

        Alert.alert('Success', 'Like sent! They will be notified that someone liked them.');
      }
    } catch (err) {
      console.error('Error liking user:', err);
      Alert.alert('Error', 'Failed to like user. Please try again.');
    }
  };

  const handleLikeUnregistered = async (phone: string, name: string) => {
    if (!contextUser?.id) {
      Alert.alert('Error', 'You must be logged in to like users.');
      return;
    }

    try {
      // Get the current user's phone number
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', contextUser.id)
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
        body: { phone, fromUserName: contextUser.name || 'Someone' }
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

  const renderUserItem = ({ item }: { item: ContactNetworkUser }) => {
    // Determine connection badge text
    let connectionBadgeText = '';
    switch (item.connection_type) {
      case 'direct':
        connectionBadgeText = 'Direct contact';
        break;
      case 'second_degree':
        connectionBadgeText = 'Friend of friend';
        break;
      case 'unregistered':
        connectionBadgeText = 'Contact';
        break;
      default:
        connectionBadgeText = 'User';
    }

    return (
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
          <Text style={styles.connectionType}>{connectionBadgeText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          message="No contacts found."
        />
      );
    }

    if (query) {
      return <EmptyState message="No users found matching your search" />;
    }

    return <EmptyState message="No posts" />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <SearchBar query={query} setQuery={setQuery} translateY={translateY} />
          <View style={styles.searchBarPlaceholder} />

          <View style={styles.contentContainer}>
            {query ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>People</Text>
                {loading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : contactNetworkUsers.length > 0 ? (
                  <FlatList
                    data={contactNetworkUsers}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.searchResultsList}
                  />
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>
                      No results found. Try a different search term or
                      invite someone new to join doggo!
                    </Text>
                  </View>
                )}
              </View>
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
            isOwner={selectedPost?.user_id === contextUser?.id}
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
    paddingHorizontal: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  userUsername: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  connectionType: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#EEEEEE',
    color: '#666666',
    alignSelf: 'flex-start',
  },
  likeButton: {
    backgroundColor: '#F85D7F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  likeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  inviteButton: {
    backgroundColor: '#4A7DFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: 'white',
    fontWeight: '600',
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
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 10,
    marginBottom: 16,
  },
  searchBarPlaceholder: {
    height: SEARCH_BAR_HEIGHT,
  },
  searchResultsList: {
    paddingBottom: 20,
    paddingTop: 10,
  },
});

export default SearchPage;
