// App.js

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import HomePage from './HomePage'; // Adjust the import based on your file structure

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HomePage />
    </GestureHandlerRootView>
  );
}
