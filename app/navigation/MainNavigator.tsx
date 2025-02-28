// app/navigation/MainNavigator.tsx
import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { MainStackParamList } from '@navigation/types';
import TabsNavigator from '@navigation/TabsNavigator';
import AddPhotoScreen from '@features/home/screens/AddPhotoScreen';
import ProfileDetailsScreen from '@features/profile/screens/ProfileDetailsScreen';
import { useApp } from '@context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '@styles/theme';

const Stack = createStackNavigator<MainStackParamList>();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ color: colors.textSecondary }}>Loading profile...</Text>
  </View>
);

const MainNavigator: React.FC = () => {
  const { state: { profile, isLoadingProfile }, refreshProfile } = useApp();

  // Ensure profile is loaded when MainNavigator mounts
  useEffect(() => {
    const ensureProfileLoaded = async () => {
      // If we already have a profile, we're good
      if (profile) return;

      // Check if we have a profile ID but no profile data yet
      const profileId = await AsyncStorage.getItem('profile_id');
      if (profileId && !profile) {
        console.log('Profile ID exists but profile not loaded, refreshing...');
        await refreshProfile();
      }
    };

    ensureProfileLoaded();
  }, [profile, refreshProfile]);

  // Show loading if profile is still loading or missing
  if (isLoadingProfile || !profile) {
    return <LoadingScreen />;
  }

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
