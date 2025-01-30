// app/navigation/MainNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types';
import TabsNavigator from '@navigation/TabsNavigator';
import AddPhotoScreen from '@features/home/screens/AddPhotoScreen';
import ProfileDetailsScreen from '@features/profile/screens/ProfileDetailsScreen';

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 1) Tabs Navigator as the default home route */}
      <Stack.Screen name="Tabs" component={TabsNavigator} />

      {/* 2) Other full-screen or modal screens on top of the tabs */}
      <Stack.Screen name="AddPhoto" component={AddPhotoScreen} />
      <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
      {/* ...other screens */}
    </Stack.Navigator>
  );
};

export default MainNavigator;
