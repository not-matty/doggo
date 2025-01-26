// app/features/auth/AuthNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import { AuthStackParamList } from '@navigation/types';

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
      {/* Remove ProfileCreationScreen */}
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
