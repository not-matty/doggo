// app/features/home/HomeNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import ProfileDetailsScreen from '../profile/screens/ProfilePage';
import { HomeStackParamList } from '@navigation/types';

const Stack = createStackNavigator<HomeStackParamList>();

const HomeNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="HomePage"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
      {/* Add other Home stack screens here */}
    </Stack.Navigator>
  );
};

export default HomeNavigator;
