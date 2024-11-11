// app/features/messages/MessagesPeek.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';

type MessagesPeekNavigationProp = StackNavigationProp<RootStackParamList, 'MessagesPeek'>;

const MessagesPeek: React.FC = () => {
  const navigation = useNavigation<MessagesPeekNavigationProp>();

  const handleViewAll = () => {
    navigation.navigate('MessagesPage');
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.modalBackground}>
      <View style={styles.peekContainer}>
        <View style={styles.peekHeader}>
          <Text style={styles.peekTitle}>New Messages</Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        {/* Placeholder for message previews */}
        <View style={styles.previewList}>
          <Text style={styles.previewText}>Message preview 1</Text>
          <Text style={styles.previewText}>Message preview 2</Text>
          {/* Add more previews as needed */}
        </View>
        <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View All Messages</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  peekContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  peekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  peekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewList: {
    marginTop: 20,
  },
  previewText: {
    fontSize: 16,
    marginBottom: 10,
  },
  viewAllButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#007aff',
    borderRadius: 5,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MessagesPeek;
