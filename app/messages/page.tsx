import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'Hello! How are you?', incoming: true },
  { id: '2', text: 'I’m good, thanks! How about you?', incoming: false },
];

type Message = {
  id: string;
  text: string;
  incoming: boolean;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim()) {
      setMessages(prevMessages => [
        ...prevMessages,
        { id: Date.now().toString(), text: inputText, incoming: false },
      ]);
      setInputText('');
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.incoming ? styles.incoming : styles.outgoing]}>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} // Adjust this offset as needed
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        keyboardDismissMode="on-drag"  // Dismiss keyboard on swipe down
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="default"
          blurOnSubmit={false}  // Keeps keyboard open on pressing 'Return'
        />
        <TouchableOpacity onPress={handleSend}>
          <Feather name="send" size={24} color="#007aff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  messageList: { padding: 10, flexGrow: 1, justifyContent: 'flex-start' },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    maxWidth: '80%',
    marginBottom: 10,
  },
  incoming: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
  },
  outgoing: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  messageText: { color: '#fff', fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,        // Consistent padding around the input
    height: 80,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    fontSize: 16,
  },
});
