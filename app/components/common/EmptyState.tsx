// EmptyState.tsx

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type EmptyStateProps = {
  message?: string;
};

const { width } = Dimensions.get('window');

const EmptyState: React.FC<EmptyStateProps> = ({ message = 'No profiles found.' }) => {
  return (
    <View style={styles.container}>
      <Feather name="user-x" size={60} color="#ccc" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    flex: 1, // Allows the container to expand to available space
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff', // Changed to white for consistency
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    color: '#ccc',
  },
});

export default EmptyState;
