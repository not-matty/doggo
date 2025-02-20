// app/navigation/AuthNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import { colors } from '@styles/theme';

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="VerifyOTP"
        component={VerifyOTPScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <AuthStack.Screen
        name="CompleteProfile"
        component={CompleteProfileScreen}
        options={{
          gestureEnabled: false,
        }}
      />
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
