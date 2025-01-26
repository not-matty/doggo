// app/navigation/RootNavigator.tsx

import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '@features/auth/AuthNavigator';
import MainNavigator from '@navigation/MainNavigator';
import { RootStackParamList } from '@navigation/types';
import { AuthContext } from '@context/AuthContext';
import { NavigationContainer } from '@react-navigation/native';
import GlobalLayout from '@layouts/GlobalLayout';

const RootStack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <GlobalLayout>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {user ? (
            <RootStack.Screen name="MainNavigator" component={MainNavigator} />
          ) : (
            <RootStack.Screen name="AuthNavigator" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </GlobalLayout>
    </NavigationContainer>
  );
};

export default RootNavigator;
