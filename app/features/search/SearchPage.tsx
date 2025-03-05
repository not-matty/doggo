// app/features/search/SearchPage.tsx

import React, { useState, useRef, useCallback, useEffect, useContext, useMemo } from 'react';
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
  ScrollView,
  ActionSheetIOS,
  Share,
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
import { colors, spacing, typography } from '@styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getContactsStats } from '../../utils/contactsHelper';
import { CardSkeleton, GridSkeleton } from '@components/common/SkeletonLoader';
import Toast from 'react-native-toast-message';
import CachedImage from '@components/common/CachedImage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { formatPhoneNumber } from '../../utils/formatters';
import { getInitials } from '../../utils/textUtils';
import * as Contacts from 'expo-contacts';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const { width } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 60;

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

// Merge SearchResult with ContactNetworkUser to have a unified interface
interface SearchResult {
  id: string;
  name: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
  profile_picture_url?: string | null;  // For backward compatibility
  phone_number?: string;  // For backward compatibility
  is_contact: boolean;
  is_registered: boolean;
  connection_type: string;
  isRegistered?: boolean;  // For backward compatibility
}

interface PhotoQueryResult {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profiles?: Array<{
    id: string;
    name: string;
    username: string;
    profile_picture_url: string | null;
  }>;
  user?: {
    name: string | null;
    username: string | null;
    profile_picture_url: string | null;
  };
}

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [contactsStats, setContactsStats] = useState<{ total: number; matched: number; hasImported?: boolean } | null>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [leftColumn, setLeftColumn] = useState<Post[]>([]);
  const [rightColumn, setRightColumn] = useState<Post[]>([]);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing...');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsImported, setContactsImported] = useState<boolean | null>(null);

  // Use both contexts, prioritizing the Clerk one
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();

  // Choose which auth context to use with safe null checking
  const contextUser = clerkAuthContext?.user || authContext?.user;
  const checkContactsPermission = clerkAuthContext?.checkContactsPermission || authContext?.checkContactsPermission;

  // Update to use a simpler animation approach
  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = scrollY.interpolate({
    inputRange: [0, 40],
    outputRange: [0, -SEARCH_BAR_HEIGHT],
    extrapolate: 'clamp',
  });

  // Regular scroll handler that manually updates the animated value
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);
  };

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
        if (stats && !stats.hasImported && clerkAuthContext?.checkContactsPermission) {
          const permissionGranted = await clerkAuthContext.checkContactsPermission();
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
    if (!refreshing) {
      setLoading(true);
      setLoadingStage('Loading explore content...');
    }

    try {
      const currentUserId = contextUser?.id;
      if (!currentUserId) {
        console.log('No user ID available for fetch');
        setLoading(false);
        return;
      }

      // Try to use the RPC function first
      try {
        console.log('Fetching posts from contact network');
        const { data, error } = await supabase.rpc('get_contact_network_posts', {
          current_user_id: currentUserId,
          limit_count: 20
        });

        if (error) {
          console.error('RPC error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          console.log(`Got ${data.length} posts from contact network`);

          // Get the user IDs from the posts to fetch their profile information
          const userIds = [...new Set(data.map((post: PhotoQueryResult) => post.user_id))];

          // Fetch profile information for these users in a single query
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, username, profile_picture_url')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
          }

          // Create a map of user IDs to their profile information
          const profilesMap = new Map();
          if (profilesData) {
            profilesData.forEach(profile => {
              profilesMap.set(profile.id, profile);
            });
          }

          // Transform data to match Post type
          const posts: Post[] = data.map((post: PhotoQueryResult) => {
            const userProfile = profilesMap.get(post.user_id);
            return {
              id: post.id,
              url: post.url,
              created_at: post.created_at,
              caption: post.caption || undefined,
              user_id: post.user_id,
              user: {
                id: post.user_id,
                name: userProfile?.name || "Unknown",
                username: userProfile?.username || "Unknown",
                profile_picture_url: userProfile?.profile_picture_url || null,
              }
            };
          });

          setExplorePosts(posts);
          // Prefetch images for height calculation
          await prefetchImages(posts);
          setLoading(false);
          return;
        }
      } catch (rpcError) {
        console.error('Failed to use RPC, falling back to direct query:', rpcError);
      }

      // Fallback: direct query to photos with explicit join to profiles
      console.log('Falling back to direct photos query');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('photos')
        .select(`
          id, 
          url, 
          caption, 
          created_at, 
          user_id,
          profiles:profiles!user_id(id, name, username, profile_picture_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fallbackError) {
        console.error('Fallback query error:', fallbackError);
        throw fallbackError;
      }

      console.log(`Got ${fallbackData?.length || 0} posts from fallback query`);

      if (fallbackData && fallbackData.length > 0) {
        // Transform fallback data to match Post type
        const posts: Post[] = fallbackData.map((post: any) => ({
          id: post.id,
          url: post.url,
          created_at: post.created_at,
          caption: post.caption || undefined,
          user_id: post.user_id,
          user: {
            id: post.user_id,
            name: post.profiles?.name || "Unknown",
            username: post.profiles?.username || "Unknown",
            profile_picture_url: post.profiles?.profile_picture_url || null,
          }
        }));

        setExplorePosts(posts);
        // Prefetch images for height calculation
        await prefetchImages(posts);
      } else {
        setExplorePosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setExplorePosts([]);
    } finally {
      if (!refreshing) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const searchContacts = async (query: string): Promise<SearchResult[]> => {
    if (!query || query.trim() === '') {
      setLoading(false);
      return [];
    }

    try {
      console.log('Searching with term:', query);

      // Use the new search_contacts_and_profiles function
      const { data, error } = await supabase.rpc(
        'search_contacts_and_profiles',
        { search_term: query }
      );

      if (error) {
        console.error('Search error:', error);
        Toast.show({
          type: 'error',
          text1: 'Database Search Error',
          text2: error.message,
          position: 'bottom',
        });
        throw error;
      }

      console.log('Search results:', data ? data.length : 0);

      if (!data || data.length === 0) {
        return [];
      }

      // Transform the results to match the expected format
      return data.map((result: any) => ({
        id: result.id,
        name: result.name || 'Unknown',
        username: result.username || '',
        phone: result.phone || '',
        phone_number: result.phone || '',  // For backward compatibility
        avatar_url: result.avatar_url || null,
        profile_picture_url: result.avatar_url || null,  // For backward compatibility
        is_contact: result.is_contact,
        is_registered: result.is_registered,
        isRegistered: result.is_registered,  // For backward compatibility
        connection_type: result.connection_type
      }));
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  };

  // Function to handle navigating to a profile
  const navigateToProfile = (item: SearchResult) => {
    if (item.is_registered) {
      navigation.navigate('ProfileDetails', { userId: item.id });
    } else {
      // Show a modal or alert explaining that this contact is not registered
      Alert.alert(
        'Unregistered Contact',
        `${item.name} hasn't joined Doggo yet. Would you like to invite them?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Invite',
            onPress: () => handleInvite(item.phone || '')
          }
        ]
      );
    }
  };

  // Function to handle inviting a contact
  const handleInvite = async (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'No phone number available for this contact.');
      return;
    }

    try {
      // Use the device's share functionality to send an SMS
      const message = `Hey! I'd like to connect with you on Doggo. Download the app here: [App Store Link]`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invitation.');
    }
  };

  // Function to handle action button press
  const handleActionPress = (item: any) => {
    // Create action sheet options based on whether the contact is registered
    const options = ['Cancel'];
    const actions = ['cancel'];

    if (item.is_registered) {
      options.push('View Profile');
      actions.push('view');
    }

    if (item.is_contact) {
      options.push('Remove Contact');
      actions.push('remove');
    } else {
      options.push('Add to Contacts');
      actions.push('add');
    }

    if (!item.is_registered && item.phone) {
      options.push('Invite to Doggo');
      actions.push('invite');
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        destructiveButtonIndex: options.indexOf('Remove Contact'),
      },
      (buttonIndex) => {
        const action = actions[buttonIndex];
        if (action === 'view') {
          navigateToProfile(item);
        } else if (action === 'remove') {
          handleRemoveContact(item);
        } else if (action === 'add') {
          handleAddContact(item);
        } else if (action === 'invite') {
          handleInvite(item.phone || '');
        }
      }
    );
  };

  // Function to handle removing a contact
  const handleRemoveContact = async (item: any) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('owner_id', contextUser?.id)
        .eq('id', item.id);

      if (error) throw error;

      // Update the results to reflect the change
      setSearchResults(prevResults =>
        prevResults.map(contact =>
          contact.id === item.id
            ? { ...contact, is_contact: false }
            : contact
        )
      );

      Toast.show({
        type: 'success',
        text1: 'Contact Removed',
        text2: `${item.name} has been removed from your contacts.`,
      });
    } catch (error) {
      console.error('Error removing contact:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove contact.',
      });
    }
  };

  // Function to handle adding a contact
  const handleAddContact = async (item: any) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          owner_id: contextUser?.id,
          contact_user_id: item.is_registered ? item.id : null,
          phone_number: item.phone || '',
          name: item.name,
          is_imported: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update the results to reflect the change
      setSearchResults(prevResults =>
        prevResults.map(contact =>
          contact.id === item.id
            ? { ...contact, is_contact: true }
            : contact
        )
      );

      Toast.show({
        type: 'success',
        text1: 'Contact Added',
        text2: `${item.name} has been added to your contacts.`,
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add contact.',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExplorePosts();
    checkContactsStatus();
  };

  const handleDeletePost = (postId: string) => {
    setExplorePosts(currentPosts => currentPosts.filter(post => post.id !== postId));
  };

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

  const renderUserItem = ({ item }: { item: SearchResult }) => {
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
          if (item.is_registered) {
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
          source={item.profile_picture_url
            ? { uri: item.profile_picture_url }
            : require('@assets/images/Default_pfp.svg.png')}
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

  const renderColumn = (posts: Post[], isRightColumn: boolean) => {
    return (
      <View style={[
        styles.column,
        {
          marginLeft: isRightColumn ? 8 : 0,
        }
      ]}>
        {posts.map((item) => {
          const height = imageHeights[item.id] || (width / 2 - 12);

          // Format the display name with @ for usernames
          const displayName = item.user.username ? `@${item.user.username}` : item.user.name || "Unknown";

          return (
            <View key={item.id} style={[styles.postContainer, { height, marginBottom: 8 }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedPost(item);
                  setPhotoViewerVisible(true);
                }}
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.postImage}
                  resizeMode="cover"
                />

                {/* Username at top left without overlay */}
                <TouchableOpacity
                  style={styles.usernameContainer}
                  onPress={() => {
                    navigation.navigate('ProfileDetails', { userId: item.user.id });
                  }}
                >
                  <Text numberOfLines={1} style={styles.usernameText}>{displayName}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderEmptyState = useMemo(() => {
    return (
      <View style={styles.emptyStateContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : query.length > 0 ? (
          <EmptyState
            icon="search"
            title="No results found"
            message="Try a different search term"
          />
        ) : contactsImported === false ? (
          <View style={styles.noContactsContainer}>
            <EmptyState
              icon="users"
              title="No contacts found"
              message="We couldn't find any of your contacts. Import your contacts to connect with friends."
            />
            <TouchableOpacity
              style={styles.importButton}
              onPress={retryContactImport}
            >
              <Text style={styles.importButtonText}>Import Contacts</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  }, [loading, query, contactsImported]);

  // Calculate image heights based on original aspect ratios
  const prefetchImages = async (posts: Post[]) => {
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
          const height = (width / 2 - 12) / aspectRatio;

          newHeights[id] = height;
        } catch (error) {
          console.error(`Error prefetching image ${id}:`, error);
          newHeights[id] = width / 2 - 12; // Default to square
        }
      }

      setImageHeights(newHeights);
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  };

  // Distribute posts between left and right columns
  useEffect(() => {
    if (explorePosts.length === 0 || Object.keys(imageHeights).length === 0) return;

    let leftHeight = 0;
    let rightHeight = 0;
    const left: Post[] = [];
    const right: Post[] = [];

    // Distribute posts to balance column heights
    explorePosts.forEach(post => {
      const postHeight = imageHeights[post.id] || (width / 2 - 12);

      // Add to shorter column
      if (leftHeight <= rightHeight) {
        left.push(post);
        leftHeight += postHeight + 8; // 8 is the margin between items
      } else {
        right.push(post);
        rightHeight += postHeight + 8;
      }
    });

    setLeftColumn(left);
    setRightColumn(right);
  }, [explorePosts, imageHeights]);

  // Check if contacts were imported
  useEffect(() => {
    const checkContactsImport = async () => {
      if (!contextUser?.id) return;

      const hasImported = await AsyncStorage.getItem(`hasImportedContacts_${contextUser.id}`);
      setContactsImported(hasImported === 'true');
    };

    checkContactsImport();
  }, [contextUser]);

  // Function to retry contact import
  const retryContactImport = async () => {
    if (!contextUser) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'You must be logged in to import contacts',
        position: 'bottom',
      });
      return;
    }

    Toast.show({
      type: 'info',
      text1: 'Contacts',
      text2: 'Checking contacts permission...',
      position: 'bottom',
    });

    try {
      // First check permission
      if (checkContactsPermission) {
        const hasPermission = await checkContactsPermission();

        if (hasPermission) {
          Toast.show({
            type: 'info',
            text1: 'Contacts',
            text2: 'Importing contacts...',
            position: 'bottom',
          });

          // Call the function defined in the AuthContext to refresh contacts
          try {
            // Get permission and fetch contacts using Expo Contacts
            const { status } = await Contacts.getPermissionsAsync();
            if (status !== 'granted') {
              const { status: newStatus } = await Contacts.requestPermissionsAsync();
              if (newStatus !== 'granted') {
                Toast.show({
                  type: 'error',
                  text1: 'Permission Denied',
                  text2: 'Contact permission is required to import contacts',
                  position: 'bottom',
                });
                return;
              }
            }

            // Fetch contacts
            const { data } = await Contacts.getContactsAsync({
              fields: [
                Contacts.Fields.PhoneNumbers,
                Contacts.Fields.Name,
                Contacts.Fields.FirstName,
                Contacts.Fields.LastName,
              ],
            });

            if (!data || data.length === 0) {
              Toast.show({
                type: 'info',
                text1: 'No Contacts',
                text2: 'No contacts found on your device',
                position: 'bottom',
              });
              return;
            }

            // Process and import contacts
            Toast.show({
              type: 'info',
              text1: 'Importing',
              text2: `Processing ${data.length} contacts...`,
              position: 'bottom',
            });

            // Mark contacts as imported
            await AsyncStorage.setItem(`hasImportedContacts_${contextUser.id}`, 'true');
            await AsyncStorage.setItem(`lastContactsUpdate_${contextUser.id}`, new Date().getTime().toString());
            setContactsImported(true);

            Toast.show({
              type: 'success',
              text1: 'Success',
              text2: 'Contacts imported successfully',
              position: 'bottom',
            });
          } catch (error) {
            console.error('Error importing contacts:', error);
            Toast.show({
              type: 'error',
              text1: 'Import Failed',
              text2: 'Could not import contacts',
              position: 'bottom',
            });
          }
        } else {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Could not access contacts',
            position: 'bottom',
          });
        }
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to import contacts',
        position: 'bottom',
      });
    }
  };

  // Function to initiate the search
  const handleSearch = async (value: string) => {
    const searchValue = value.trim();
    setSearchQuery(searchValue);

    if (!searchValue) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Toast.show({
      type: 'info',
      text1: 'Searching...',
      text2: `Looking for "${searchValue}"`,
      position: 'bottom',
    });

    try {
      const searchResults = await searchContacts(searchValue);
      setSearchResults(searchResults);

      // Show result count as toast
      Toast.show({
        type: 'success',
        text1: 'Search Complete',
        text2: `Found ${searchResults.length} results`,
        position: 'bottom',
      });
    } catch (error) {
      console.error('Search error:', error);
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'Something went wrong while searching',
        position: 'bottom',
      });
      Alert.alert('Search Error', 'Something went wrong while searching.');
    } finally {
      setLoading(false);
    }
  };

  // Add debounced search effect
  useEffect(() => {
    const debouncedSearch = debounce((value: string) => {
      handleSearch(value);
    }, 500); // 500ms delay to avoid too many searches while typing

    if (query) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
      setLoading(false);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Animated.View
              style={[
                styles.searchBarContainer,
                { transform: [{ translateY }] }
              ]}
            >
              <SearchBar query={query} setQuery={setQuery} />
            </Animated.View>
          </View>

          <View style={styles.contentContainer}>
            {query ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>People</Text>
                {loading ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : searchResults.length > 0 ? (
                  <FlatList
                    data={searchResults}
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
              <ScrollView
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.gridContainer}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                  />
                }
              >
                <View style={styles.masonryContainer}>
                  {renderColumn(leftColumn, false)}
                  {renderColumn(rightColumn, true)}
                </View>
              </ScrollView>
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
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  postContainer: {
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    // Remove or comment out these styles
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
    // padding: 8,
    // backgroundColor: 'rgba(0,0,0,0.3)',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  userName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  searchResultsList: {
    paddingTop: SEARCH_BAR_HEIGHT + 20,
    paddingBottom: 20,
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  searchBarContainer: {
    width: '100%',
    backgroundColor: colors.background,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerContainer: {
    width: '100%',
    height: SEARCH_BAR_HEIGHT,
    position: 'absolute',
    zIndex: 10,
    top: 0,
    left: 0,
    right: 0,
  },
  gridContainer: {
    paddingTop: SEARCH_BAR_HEIGHT + 16,
    paddingBottom: 16,
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  column: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
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
  usernameContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '80%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  usernameText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeletonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  importButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SearchPage;
