// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './app/navigation/RootNavigator';
import { AuthProvider } from './app/context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
