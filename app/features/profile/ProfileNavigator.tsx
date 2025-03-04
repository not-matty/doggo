// app/features/profile/ProfileNavigator.tsx

import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './screens/ProfilePage';
import ProfileDetailsPage from './screens/ProfileDetailsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import { ProfileStackParamList } from '@navigation/types';
import { AuthContext } from '@context/AuthContext';
import { useClerkAuthContext } from '@context/ClerkAuthContext';
import { colors } from '@styles/theme';

const ProfileStack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  // Use both contexts, prioritizing Clerk
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();

  // Safely access the user with null checking
  const contextUser = clerkAuthContext?.user || authContext?.user;

  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfilePage"
        component={ProfilePage}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerBackTitleVisible: false,
          headerTintColor: colors.primary
        }}
      />
      <ProfileStack.Screen
        name="ProfileDetails"
        component={ProfileDetailsPage}
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerBackTitleVisible: false,
          headerTintColor: colors.primary
        }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          headerTitle: 'Edit Profile',
          headerBackTitleVisible: false,
          headerTintColor: colors.primary,
          headerStyle: {
            backgroundColor: colors.background,
            shadowColor: 'transparent',
            elevation: 0,
          },
        }}
      />
      {/* Add other Profile stack screens here if needed */}
    </ProfileStack.Navigator>
  );
};

export default ProfileNavigator;
