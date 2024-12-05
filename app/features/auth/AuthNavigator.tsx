// app/features/auth/AuthNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './LoginPage';
import Register from './RegisterPage';
import { AuthStackParamList } from '@navigation/types';

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen
        name="Login"
        component={Login}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={Register}
        options={{ headerShown: false }}
      />
      {/* Add other Auth stack screens here */}
    </AuthStack.Navigator>
  );
};

export default AuthNavigator;
