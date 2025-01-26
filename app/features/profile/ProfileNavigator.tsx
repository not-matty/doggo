// app/features/profile/ProfileNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './screens/ProfilePage';
import ProfileDetailsPage from './screens/ProfileDetailsScreen';
import { ProfileStackParamList } from '@navigation/types';

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
      {/* Add other Profile stack screens here if needed */}
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
