// app/features/messages/MessagesNavigator.tsx

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MessagesPage from './MessagesPage';
import { MessagesStackParamList } from '../../navigation/types';

const MessagesStack = createStackNavigator<MessagesStackParamList>();

const MessagesNavigator: React.FC = () => {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen 
        name="MessagesPage" 
        component={MessagesPage} 
        options={{ headerShown: false }} 
      />
      {/* Add more screens related to Messages here if needed */}
    </MessagesStack.Navigator>
  );
};

export default MessagesNavigator;
