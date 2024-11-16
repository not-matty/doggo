// app/features/home/HomeNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomePage from './HomePage';
import { HomeStackParamList } from '@navigation/types';

const HomeStack = createStackNavigator<HomeStackParamList>();

const HomeNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomePage"
        component={HomePage}
        options={{ headerShown: false }}
      />
      {/* Add other Home stack screens here if needed */}
    </HomeStack.Navigator>
  );
};

export default HomeNavigator;
