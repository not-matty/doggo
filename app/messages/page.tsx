import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

type Message = {
  id: string;
  text: string;
  incoming: boolean;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How are you?', incoming: true },
    { id: '2', text: 'I’m good, thanks! How about you?', incoming: false },
  ]);
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70} // Adjust based on your header height if needed
    >
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="default" // Keeps the label as "Return"
          onSubmitEditing={handleSend} // Calls handleSend when "Return" is pressed
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
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
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
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
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
