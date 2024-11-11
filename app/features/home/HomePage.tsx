// app/features/home/HomePage.tsx

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import Feather from 'react-native-vector-icons/Feather';
import { Swipeable } from 'react-native-gesture-handler';

// Define the navigation prop type for HomePage
type HomeNavigationProp = StackNavigationProp<RootStackParamList, 'Tabs'>;

const HomePage: React.FC = () => {
  const navigation = useNavigation<HomeNavigationProp>();

  const handlePeekPress = () => {
    navigation.navigate('MessagesPeek');
  };

  const handleSwipeOpen = () => {
    navigation.navigate('MessagesPage');  // Navigates to MessagesPage on swipe open
  };

  const renderRightActions = () => (
    <TouchableOpacity style={styles.peekContainer} onPress={handlePeekPress}>
      <Text style={styles.peekText}>Peek Messages →</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Messages Icon in Top Right Corner */}
      <TouchableOpacity
        onPress={() => navigation.navigate('MessagesPage')}  // Button to navigate to MessagesPage
        style={styles.messagesIcon}
        accessibilityLabel="Navigate to Messages"
      >
        <Feather name="send" size={30} color="#000" />
      </TouchableOpacity>

      {/* Swipeable Section for Main Content */}
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={handleSwipeOpen}  // Trigger navigation to MessagesPage on swipe
        overshootRight={false}
        friction={2}
      >
        <View style={styles.homeContent}>
          <Text style={styles.mainText}>Home Page Content</Text>
        </View>
      </Swipeable>
    </View>
  );
};

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
    top: 0,  // Adjusted for different devices
    right: 20,
    padding: 10,
    zIndex: 1,
  },
  peekContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    width: 150,
    height: '100%',
  },
  peekText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
});

export default HomePage;
