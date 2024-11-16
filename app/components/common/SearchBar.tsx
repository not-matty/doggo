import React from 'react';
import { View, TextInput, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type SearchBarProps = {
  query: string;
  setQuery: (text: string) => void;
  translateY: Animated.Value;
};

const SearchBar: React.FC<SearchBarProps> = ({ query, setQuery, translateY }) => {
  const clearSearch = () => setQuery('');

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
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
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={clearSearch}>
          <Feather name="x-circle" size={20} color="#888" style={styles.icon} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20, // Adjusted for SafeAreaView
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
  },
});

export default SearchBar;
