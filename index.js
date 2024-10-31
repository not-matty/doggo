import { registerRootComponent } from 'expo';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from './ErrorBoundary';
import App from './App';  // Assuming App is your main component or navigator

function RootApp() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

registerRootComponent(RootApp);
