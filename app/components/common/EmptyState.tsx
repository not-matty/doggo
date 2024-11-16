import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Must match other components

const EmptyState: React.FC = () => {
  return (
    <View style={styles.container}>
      <Feather name="user-x" size={60} color="#ccc" />
      <Text style={styles.text}>No profiles found.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height - SEARCH_BAR_HEIGHT - 60, // Adjusted for search bar and footer
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#ccc',
  },
});

export default EmptyState;
