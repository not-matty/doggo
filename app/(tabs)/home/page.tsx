import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

export default function HomePage() {
  const router = useRouter();

  const renderRightActions = () => (
    <TouchableOpacity style={styles.peekContainer} onPress={() => router.push('/messages/page')}>
      <Text style={styles.peekText}>Peek Messages →</Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Messages Icon in Top Right Corner */}
      <TouchableOpacity
        onPress={() => router.push('/messages/page')}
        style={styles.messagesIcon}
      >
        <Feather name="send" size={30} color="#000" />
      </TouchableOpacity>

      {/* Yarn Circle Icon */}
      <TouchableOpacity
        onPress={() => router.push('/search/page')}
        style={styles.yarn}
      >
        <Text style={styles.yarnText}>🧶</Text>
      </TouchableOpacity>

      {/* Swipeable Section for Main Content */}
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={() => router.push('/messages/page')}
      >
        <View style={styles.homeContent}>
          <Text style={styles.mainText}>Home Page Content</Text>
        </View>
      </Swipeable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
  },
  homeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  messagesIcon: {
    position: 'absolute',
    top: 70,
    right: 10,
    padding: 10,
  },
  yarn: { 
    position: 'absolute',
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#ff4d4d', 
    justifyContent: 'center', 
    alignItems: 'center',
    bottom: 30,
    alignSelf: 'center',
  },
  yarnText: { 
    fontSize: 40, 
    color: '#fff',
  },
  peekContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    width: 100,
    height: '100%',
  },
  peekText: {
    fontSize: 16,
    color: '#333',
  },
});
