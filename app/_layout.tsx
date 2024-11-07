// app/_layout.tsx

import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login/page');
    }
  }, [isLoggedIn, router]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    router.replace('/home/page');
  };

  return (
    <GestureHandlerRootView style={styles.gestureHandler}>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Tabs Layout */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Messages Screen */}
        <Stack.Screen
          name="messages/page"
          options={{
            headerShown: false,
            gestureEnabled: true, // Enable gestures for Messages page
            animation: 'slide_from_right', // Use default slide animation
          }}
        />

        {/* Login Screen */}
        <Stack.Screen name="login/page" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
});
