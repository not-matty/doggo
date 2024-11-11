// app/features/auth/AuthNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginPage from './LoginPage';
import { AuthStackParamList } from '@/navigation/types'; // Updated import with path alias

const AuthStack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
    return (
        <AuthStack.Navigator>
            <AuthStack.Screen
                name="Login"
                component={LoginPage}
                options={{ headerShown: false }}
            />
            {/* Add more authentication screens here if needed */}
        </AuthStack.Navigator>
    );
};

export default AuthNavigator;
