// app/navigation/MainNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '@features/home/screens/HomeScreen';
import AddPhotoScreen from '@features/home/screens/AddPhotoScreen';
import ProfileDetailsScreen from '@features/profile/screens/ProfileDetailsScreen';
import { MainStackParamList } from '@navigation/types'; // Define your types accordingly

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }} // Hide default headers
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddPhoto" component={AddPhotoScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      {/* Add other screens as needed */}
    </Stack.Navigator>
  );
};

export default MainNavigator;
