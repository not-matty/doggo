// app/features/profile/ProfileNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './ProfilePage';
import ProfileDetailsPage from './ProfileDetailsPage';
import { ProfileStackParamList } from '@navigation/types'; // Ensure correct path alias

const ProfileStack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen 
        name="ProfilePage" 
        component={ProfilePage} 
        options={{ headerShown: false }} 
      />
      <ProfileStack.Screen 
        name="ProfileDetails" 
        component={ProfileDetailsPage} 
        options={{ headerShown: false }} 
      />
      {/* Add more Profile-related screens here if needed */}
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
