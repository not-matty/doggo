// app/features/home/HomeNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import ProfileDetailsScreen from '../profile/screens/ProfileDetailsScreen';
import { HomeStackParamList } from '@navigation/types';
import { colors } from '@styles/theme';

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
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerBackTitleVisible: false,
          headerTintColor: colors.primary
        }}
      />
      {/* Add other Home stack screens here */}
    </Stack.Navigator>
  );
};

export default HomeNavigator;
