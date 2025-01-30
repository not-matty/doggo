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
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList, User } from '@navigation/types';
import SearchBar from '@components/common/SearchBar';
import EmptyState from '@components/common/EmptyState';
import { supabase } from '@services/supabase';
import debounce from 'lodash.debounce';
import { AuthContext } from '@context/AuthContext';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const { width } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70;

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const { user } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.trim() === '') {
        // If query is empty, reset to empty
        setFilteredUsers([]);
        return;
      }

      try {
        // Step 1: Get contacts of the current user
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('contact_user_id')
          .eq('user_id', user?.id);

        if (contactsError) {
          console.error('Error fetching contacts:', contactsError);
          Alert.alert('Error', 'Failed to fetch your contacts.');
          return;
        }

        const contactUserIds = contactsData?.map(contact => contact.contact_user_id) || [];

        if (contactUserIds.length === 0) {
          setFilteredUsers([]);
          return;
        }

        // Step 2: Search within contacts
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('name', `%${searchQuery}%`)
          .in('id', contactUserIds);

        if (error) {
          console.error('Error searching profiles:', error);
          Alert.alert('Error', 'Failed to search contacts.');
        } else {
          setFilteredUsers(data as User[]);
        }
      } catch (err) {
        console.error('Search error:', err);
        Alert.alert('Error', 'An unexpected error occurred during search.');
      }
    }, 300),
    [user]
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

  // Navigate to ProfileDetails passing userId
  const handlePressProfile = (userId: string) => {
    navigation.navigate('ProfileDetails', { userId });
  };

  // Render each user in the search results
  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItemContainer}
      onPress={() => handlePressProfile(item.id)}
    >
      <Image
        source={{ uri: item.profile_picture_url || 'https://via.placeholder.com/50' }}
        style={styles.userAvatar}
      />
      <Text style={styles.userNameText}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: SEARCH_BAR_HEIGHT + 20,
              paddingBottom: 60,
            }}
            ListEmptyComponent={<EmptyState />}
          />
          {/* Animated SearchBar */}
          <SearchBar query={query} setQuery={setQuery} translateY={translateY} />

          {/* Optional Footer / Tabs area */}
          <View style={styles.footer}>
            {/* e.g., <Footer /> or keep it blank if you rely on bottom tabs */}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default SearchPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // Dark background
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userNameText: {
    color: '#fff',
    fontSize: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width,
    height: 60, // matches your design
  },
});
