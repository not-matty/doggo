// App.tsx

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@navigation/RootNavigator';
import { ClerkProvider } from '@context/ClerkProvider';
import { AppProvider } from '@context/AppContext';
import ClerkAuthContextProvider from '@context/ClerkAuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import { navigationRef } from '@navigation/RootNavigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@services/queryClient';

const App: React.FC = () => {
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      // Request permissions in parallel
      const [libraryResponse, cameraResponse, contactsResponse] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(true),
        ImagePicker.requestCameraPermissionsAsync(),
        Contacts.requestPermissionsAsync()
      ]);

      // Handle library permissions
      if (!libraryResponse.granted) {
        Alert.alert(
          'Photo Access Required',
          'This app needs access to your photo library to share photos. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }

      // Handle camera permissions
      if (!cameraResponse.granted) {
        Alert.alert(
          'Camera Access Required',
          'This app needs access to your camera to take photos. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }

      // Handle contacts permissions
      if (!contactsResponse.granted) {
        Alert.alert(
          'Contacts Access Required',
          'This app needs access to your contacts to help you connect with friends. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider>
        <NavigationContainer ref={navigationRef}>
          <ClerkAuthContextProvider>
            <AppProvider>
              <RootNavigator />
            </AppProvider>
          </ClerkAuthContextProvider>
        </NavigationContainer>
      </ClerkProvider>
    </QueryClientProvider>
  );
};

export default App;
