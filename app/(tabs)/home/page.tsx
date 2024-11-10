// HomePage.js
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from 'react-native-vector-icons/Feather';
import { Swipeable } from 'react-native-gesture-handler';

export default function HomePage() {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const handlePeekPress = () => {
    setModalVisible(true);
  };

  const handleSwipeOpen = () => {
    router.push('/messages/page');
  };

  const closeModal = () => {
    setModalVisible(false);
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
        onPress={() => router.push('/messages/page')}
        style={styles.messagesIcon}
        accessibilityLabel="Navigate to Messages"
      >
        <Feather name="send" size={30} color="#000" />
      </TouchableOpacity>

      {/* Yarn Circle Icon */}
      <TouchableOpacity
        onPress={() => router.push('/search/page')}
        style={styles.yarn}
        accessibilityLabel="Navigate to Search"
      >
        <Text style={styles.yarnText}>🧶</Text>
      </TouchableOpacity>

      {/* Swipeable Section for Main Content */}
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={handleSwipeOpen}
        overshootRight={false}
        friction={2}
      >
        <View style={styles.homeContent}>
          <Text style={styles.mainText}>Home Page Content</Text>
        </View>
      </Swipeable>

      {/* Peek Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={closeModal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Messages Preview</Text>
            <Text style={styles.modalText}>You have new messages!</Text>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
    top: 50, // Adjusted for different devices
    right: 20,
    padding: 10,
    zIndex: 1,
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
    elevation: 5, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  yarnText: { 
    fontSize: 40, 
    color: '#fff',
  },
  peekContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DDDDDD',
    width: 150, // Increased width for better visibility
    height: '100%',
  },
  peekText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
