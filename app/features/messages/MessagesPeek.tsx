import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const PEEK_THRESHOLD = -width * 0.5; // Threshold for snapping open the peek screen

// Define the context type, extending Record<string, unknown>
interface GestureContext extends Record<string, unknown> {
  startX: number;
}

const MessagesPeek: React.FC = () => {
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    GestureContext
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value; // TypeScript now knows startX exists on ctx
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
    },
    onEnd: () => {
      if (translateX.value < PEEK_THRESHOLD) {
        // Snap open
        translateX.value = withSpring(-width);
      } else {
        // Snap back to the original position
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.peekContainer, animatedStyle]}>
        <View style={styles.peekHeader}>
          <Text style={styles.peekTitle}>New Messages</Text>
        </View>
        <View style={styles.previewList}>
          <Text style={styles.previewText}>Message preview 1</Text>
          <Text style={styles.previewText}>Message preview 2</Text>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  peekContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: width,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderColor: '#ddd',
    padding: 20,
  },
  peekHeader: {
    marginBottom: 10,
  },
  peekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewList: {
    marginTop: 10,
  },
  previewText: {
    fontSize: 14,
    color: '#555',
  },
});

export default MessagesPeek;
