// app/features/home/HomeNavigator.tsx

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { createStackNavigator } from '@react-navigation/stack';
import HomePage from './HomePage';
import MessagesPeek from '../messages/MessagesPeek';
import { HomeStackParamList } from '../../navigation/types';

const HomeStack = createStackNavigator<HomeStackParamList>();

const HomeNavigator: React.FC = () => {
  const [isPeeking, setIsPeeking] = useState(false);

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    if (translationX < -50) {
      setIsPeeking(true);
    }
  };

  const onHandlerStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (event.nativeEvent.state === State.END) {
      setIsPeeking(false);
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <View style={styles.container}>
        <HomeStack.Navigator>
          <HomeStack.Screen
            name="HomePage"
            component={HomePage}
            options={{ headerShown: false }}
          />
        </HomeStack.Navigator>
        {isPeeking && <MessagesPeek />}
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});

export default HomeNavigator;
