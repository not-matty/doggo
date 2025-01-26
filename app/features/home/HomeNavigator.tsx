// app/features/home/HomeNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './screens/HomeScreen';
import ProfileDetailsScreen from '@features/profile/screens/ProfileDetailsScreen'; // Create this screen as needed
import { HomeStackParamList } from '@navigation/types';

const HomeStack = createStackNavigator<HomeStackParamList>();

const HomeNavigator: React.FC = () => {
  return (
    <HomeStack.Navigator
      initialRouteName="HomePage"
      screenOptions={{
        headerShown: false,
      }}
    >
      <HomeStack.Screen name="HomePage" component={HomeScreen} />
      <HomeStack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      {/* Add other Home stack screens here */}
    </HomeStack.Navigator>
  );
};

export default HomeNavigator;
