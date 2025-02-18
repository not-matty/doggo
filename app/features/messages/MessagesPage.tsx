import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import MessageBubble from '@components/common/MessageBubble';
import { colors, typography, shadows } from '@styles/theme';

type Message = {
  id: string;
  text: string;
  incoming: boolean;
};

const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 56;
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
      </View>
      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background
  },
  messageList: { 
    padding: 10 
  },
  headerContainer: {
    height: HEADER_HEIGHT + STATUS_BAR_HEIGHT,
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  header: {
    height: HEADER_HEIGHT,
    marginTop: STATUS_BAR_HEIGHT,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});

export default MessagesPage;
