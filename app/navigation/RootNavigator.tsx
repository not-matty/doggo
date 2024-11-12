// app/navigation/RootNavigator.tsx

import React, { useContext, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '@features/auth/AuthNavigator';
import TabsNavigator from '@navigation/TabsNavigator';
import MessagesPeek from '@features/messages/MessagesPeek';
import MessagesNavigator from '@features/messages/MessagesNavigator';
import { RootStackParamList } from '@/navigation/types';
import GlobalLayout from '@layouts/GlobalLayout';
import { AuthContext } from '../context/AuthContext';
import { useNavigationContainerRef } from '@react-navigation/native';

const RootStack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef.isReady()) {
      if (isAuthenticated) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Tabs' }],
        });
      } else {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    }
  }, [isAuthenticated, navigationRef]);

  return (
    <GlobalLayout>
      <RootStack.Navigator
        initialRouteName={isAuthenticated ? 'Tabs' : 'Auth'}
        screenOptions={{
          headerShown: false,
          // Remove 'presentation: modal' to prevent screens from appearing as modals
        }}
      >
        <RootStack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="Tabs"
          component={TabsNavigator}
          options={{ headerShown: false }}
        />
        <RootStack.Screen
          name="MessagesPeek"
          component={MessagesPeek}
          options={{headerShown: false }} 
        />
        <RootStack.Screen
          name="MessagesPage"
          component={MessagesNavigator}
          options={{ headerShown: false }}
        />
      </RootStack.Navigator>
    </GlobalLayout>
  );
};

export default RootNavigator;
