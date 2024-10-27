// app/_layout.tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

export default function Layout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Assume not logged in initially
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login/page'); // Redirect to the correct login route if not logged in
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    router.replace('/home/page'); // Redirect to home after logging in
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main Tabs Layout */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Login Screen */}
      <Stack.Screen name="login/page" options={{ headerShown: false }} />

      {/* Messages Screen with Back Button */}
      <Stack.Screen
        name="messages/page"
        options={{
          headerShown: true,
          title: 'Messages',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 10 }}>
              <Feather name="chevron-left" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
