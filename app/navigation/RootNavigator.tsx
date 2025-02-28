// app/navigation/RootNavigator.tsx

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '@features/auth/AuthNavigator';
import MainNavigator from '@navigation/MainNavigator';
import { RootStackParamList } from '@navigation/types';
import GlobalLayout from '@layouts/GlobalLayout';
import { useAuth } from '@clerk/clerk-expo';
import { useApp } from '@context/AppContext';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '@styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootStack = createStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ color: colors.textSecondary }}>Loading...</Text>
  </View>
);

const RootNavigator: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { state: { isLoadingProfile }, dispatch } = useApp();
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Check if profile exists and set profileLoaded accordingly
  useEffect(() => {
    const checkProfileStatus = async () => {
      // If not signed in, no need to check profile
      if (!isSignedIn) {
        setProfileLoaded(true);
        return;
      }

      try {
        // Check if profile ID exists in AsyncStorage
        const profileId = await AsyncStorage.getItem('profile_id');
        if (profileId) {
          console.log('Profile confirmed loaded:', profileId);
          setProfileLoaded(true);

          // Also notify app context that profile is loaded
          if (isLoadingProfile && dispatch) {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          // Recheck after a brief delay if not found yet
          setTimeout(checkProfileStatus, 500);
        }
      } catch (error) {
        console.error('Error checking profile status:', error);
        setProfileLoaded(true); // Proceed anyway to prevent blocking UI
      }
    };

    checkProfileStatus();
  }, [isSignedIn, isLoadingProfile, dispatch]);

  // Show loading screen while Clerk is initializing or profile is being loaded
  if (!isLoaded || (isSignedIn && (!profileLoaded || isLoadingProfile))) {
    return <LoadingScreen />;
  }

  return (
    <GlobalLayout>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <RootStack.Screen name="MainNavigator" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="AuthNavigator" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </GlobalLayout>
  );
};

export default RootNavigator;
