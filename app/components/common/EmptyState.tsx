// EmptyState.tsx

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

type EmptyStateProps = {
  message?: string;
  title?: string;
  icon?: string;
};

const { width } = Dimensions.get('window');

const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No profiles found.',
  title,
  icon = 'user-x'
}) => {
  return (
    <View style={styles.container}>
      <Feather name={icon} size={60} color="#ccc" />
      {title && <Text style={styles.title}>{title}</Text>}
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
  title: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  text: {
    marginTop: 10,
    fontSize: 18,
    color: '#ccc',
  },
});

export default EmptyState;
