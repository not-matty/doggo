// app/components/common/UserItem.tsx

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type UserItemProps = {
  name: string;
  onPress: () => void;
};

const UserItem: React.FC<UserItemProps> = ({ name, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.userItem}>
      <Text style={styles.userName}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  userItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  userName: {
    fontSize: 18,
    color: '#000',
  },
});

export default UserItem;
