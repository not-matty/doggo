// app/features/profile/ProfileNavigator.tsx

import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './screens/ProfilePage';
import ProfileDetailsPage from './screens/ProfileDetailsScreen';
import { ProfileStackParamList } from '@navigation/types';
import { AuthContext } from '@context/AuthContext';

const ProfileStack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  const { user } = useContext(AuthContext);

  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfilePage"
        component={ProfilePage}
        initialParams={{ userId: user?.id }}
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
