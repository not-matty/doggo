// app/navigation/MainStackNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from '@features/auth/AuthNavigator';
import TabsNavigator from '@navigation/TabsNavigator';
import HomeNavigator from '@features/home/HomeNavigator';
import MessagesNavigator from '@features/messages/MessagesNavigator';
import SearchNavigator from '@features/search/SearchNavigator';
import ProfileNavigator from '@features/profile/ProfileNavigator';
import MessagesPeek from '@features/messages/MessagesPeek';
import { RootStackParamList } from '@navigation/types';

const MainStack = createStackNavigator<RootStackParamList>();

const MainNavigator: React.FC = () => {
  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="AuthNavigator"
        component={AuthNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="TabsNavigator"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="HomeNavigator"
        component={HomeNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="MessagesNavigator"
        component={MessagesNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="SearchNavigator"
        component={SearchNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="ProfileNavigator"
        component={ProfileNavigator}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="MessagesPeek"
        component={MessagesPeek}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="MessagesPage"
        component={MessagesNavigator}
        options={{ headerShown: false }}
      />
      {/* Add other navigators or screens as needed */}
    </MainStack.Navigator>
  );
};

export default MainNavigator;
