// MessageBubble.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MessageBubbleProps = {
  text: string;
  incoming: boolean;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ text, incoming }) => {
  return (
    <View
      style={[
        styles.bubble,
        incoming ? styles.incoming : styles.outgoing,
      ]}
    >
      <Text style={incoming ? styles.incomingText : styles.outgoingText}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginVertical: 5,
  },
  incoming: {
    backgroundColor: '#f0f0f0', // Lighter gray for incoming
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
  },
  outgoing: {
    backgroundColor: '#1E90FF', // Adjusted to a consistent blue shade
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  incomingText: {
    color: '#000',
    fontSize: 16,
  },
  outgoingText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default MessageBubble;
