// app/features/search/SearchPage.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SearchStackParamList, Profile } from '@navigation/types';
import SearchBar from '@components/common/SearchBar';
import UserItem from '@components/common/UserItem';
import EmptyState from '@components/common/EmptyState';
import { demoProfiles } from '@data/demoProfiles';
import debounce from 'lodash.debounce';

type SearchPageNavigationProp = StackNavigationProp<SearchStackParamList, 'SearchPage'>;

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Must match other components

const SearchPage: React.FC = () => {
  const navigation = useNavigation<SearchPageNavigationProp>();
  const [query, setQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>(demoProfiles);
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  // Debounced search function
  const performSearch = useCallback(
    debounce((searchQuery: string) => {
      const lowercasedQuery = searchQuery.toLowerCase();
      setFilteredProfiles(
        demoProfiles.filter((profile) =>
          profile.name.toLowerCase().includes(lowercasedQuery)
        )
      );
    }, 300),
    []
  );

  useEffect(() => {
    performSearch(query);
    return performSearch.cancel;
  }, [query, performSearch]);

  const onScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const direction = currentScrollY > lastScrollY.current ? 'down' : 'up';
    lastScrollY.current = currentScrollY;

    if (direction === 'down') {
      Animated.timing(translateY, {
        toValue: -SEARCH_BAR_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY]);

  const renderItem = ({ item }: { item: Profile }) => (
    <UserItem profile={item} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.container}>
          <FlatList
            data={filteredProfiles}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingTop: SEARCH_BAR_HEIGHT + 20, paddingBottom: 60 }} // Adjusted for search bar and footer
            ListEmptyComponent={<EmptyState />}
          />
          <SearchBar query={query} setQuery={setQuery} translateY={translateY} />
          <View style={styles.footer}>
            {/* Add your Footer component here if needed */}
            {/* Example: <Footer /> */}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // Dark background for better image display
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: 60, // Adjust based on your Footer component's height
    // You can include the Footer component here or style it as needed
  },
});

export default SearchPage;
