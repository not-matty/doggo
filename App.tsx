// App.tsx

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from '@navigation/RootNavigator';
import { AuthProvider } from '@context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Contacts from 'expo-contacts';
import { Alert, Platform } from 'react-native';
import { navigationRef } from '@navigation/RootNavigation';

const App: React.FC = () => {
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      // Request photo library permission
      const libraryResponse = await ImagePicker.requestMediaLibraryPermissionsAsync(true); // true for requesting "all photos" access
      if (!libraryResponse.granted) {
        Alert.alert(
          'Photo Access Required',
          'This app needs access to your photo library to share photos. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }

      // Request camera permission
      const cameraResponse = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraResponse.granted) {
        Alert.alert(
          'Camera Access Required',
          'This app needs access to your camera to take photos. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }

      // Request contacts permission
      const contactsResponse = await Contacts.requestPermissionsAsync();
      if (!contactsResponse.granted) {
        Alert.alert(
          'Contacts Access Required',
          'This app needs access to your contacts to help you connect with friends. Please enable it in your settings.',
          [{ text: 'OK' }]
        );
      }

      // For iOS, we also need to request photo library access with "addOnly" permission
      if (Platform.OS === 'ios') {
        await ImagePicker.requestMediaLibraryPermissionsAsync(false); // false for "addOnly" access
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
