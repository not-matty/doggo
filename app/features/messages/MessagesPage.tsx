import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import CustomHeader from '@components/common/CustomHeader';
import MessageBubble from '@components/common/MessageBubble';

type Message = {
  id: string;
  text: string;
  incoming: boolean;
};

const messages: Message[] = [
  { id: '1', text: 'Hello!', incoming: true },
  { id: '2', text: 'Hi there!', incoming: false },
  // Add more messages as needed
];

const MessagesPage: React.FC = () => {
  const renderItem = ({ item }: { item: Message }) => (
    <MessageBubble text={item.text} incoming={item.incoming} />
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Messages" />
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  messageList: { 
    padding: 10 
  },
});

export default MessagesPage;
