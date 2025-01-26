// App.tsx

import React from 'react';
import RootNavigator from '@navigation/RootNavigator';
import { AuthProvider } from '@context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
};

export default App;
