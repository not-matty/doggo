import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, PanResponder } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomePage() {
  const router = useRouter();

  const handleTapOnYarn = () => {
    router.push('/messages/page');
  };

  // PanResponder for detecting only right-to-left swipes
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        console.log("Move dx:", gestureState.dx); // Log dx to see movement direction
        // Only respond to significant leftward movements
        return gestureState.dx < -10;  // Lower threshold for detecting leftward movement
      },
      onPanResponderRelease: (evt, gestureState) => {
        console.log("Release dx:", gestureState.dx); // Log dx on release
        if (gestureState.dx < -50) { // Left swipe release threshold
          console.log("Left swipe detected. Navigating to Messages.");
          router.push('/messages/page');
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <TouchableOpacity onPress={handleTapOnYarn} style={styles.yarn}>
        <Text style={styles.yarnText}>🧶</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  yarn: { width: 200, height: 200, borderRadius: 500, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center' },
  yarnText: { fontSize: 60, color: '#fff' },
});
