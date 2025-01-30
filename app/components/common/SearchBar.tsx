// app/components/common/SearchBar.tsx

import React from 'react';
import { View, TextInput, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchBarProps = {
  query: string;
  setQuery: (text: string) => void;
  translateY: Animated.Value; // Required
};

const SearchBar: React.FC<SearchBarProps> = ({ query, setQuery, translateY }) => {
  const insets = useSafeAreaInsets(); // Using safe area insets for dynamic positioning

  const clearSearch = () => setQuery('');

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          transform: [{ translateY }], 
          top: insets.top, // Adjust as needed
        }
      ]}
    >
      <Feather name="search" size={20} color="#888" style={styles.icon} />
      <TextInput
        placeholder="Search"
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessible
        accessibilityLabel="Search Input"
        placeholderTextColor="#888"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={clearSearch} accessibilityLabel="Clear Search">
          <Feather name="x-circle" size={20} color="#888" style={styles.icon} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000, // Ensure it's above other components
  },
  icon: {
    marginHorizontal: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000', // Ensuring text color is visible
  },
});
