// app/navigation/RootNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '@features/auth/AuthNavigator';
import MainNavigator from '@navigation/MainNavigator';
import { RootStackParamList } from '@navigation/types';
import GlobalLayout from '@layouts/GlobalLayout';
import { useAuth } from '@clerk/clerk-expo';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors } from '@styles/theme';
import { SignedIn, SignedOut } from '@components/auth/AuthGuard';

const RootStack = createStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ color: colors.textSecondary }}>Loading...</Text>
  </View>
);

const RootNavigator: React.FC = () => {
  const { isSignedIn } = useAuth();

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
