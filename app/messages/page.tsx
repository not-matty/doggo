// app/messages/page.tsx

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
import { useRouter } from 'expo-router';

type Message = {
  id: string;
  text: string;
  incoming: boolean;
};

const INITIAL_MESSAGES: Message[] = [
  { id: '1', text: 'I\'m in love with you', incoming: true },
  { id: '2', text: 'No', incoming: false },
];

export default function MessagesPage() {
  const router = useRouter();
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
    <View
      style={[
        styles.messageBubble,
        item.incoming ? styles.incoming : styles.outgoing,
      ]}
    >
      <Text style={item.incoming ? styles.incomingText : styles.outgoingText}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? -10 : 0}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerLeftButton}
        >
          <Feather name="chevron-left" size={30} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        keyboardDismissMode="on-drag"
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
          <Feather name="send" size={30} color="#000000" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100, // Adjust header height as needed
    paddingTop: Platform.OS === 'ios' ? 70 : 20, // Adjust paddingTop based on platform
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  headerLeftButton: {
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageList: { 
    padding: 10, 
    flexGrow: 1, 
    justifyContent: 'flex-start' 
  },
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
    marginTop: 10,
  },
  outgoing: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
  },
  incomingText: {
    fontSize: 16,
    color: '#000',
  },
  outgoingText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#f1f1f1',
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
  },
});
