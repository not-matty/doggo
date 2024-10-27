import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfilePage() {
  const router = useRouter();
  const isLoggedIn = false;  // Simulate authentication status

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login/page');  // Redirect to Login page if not authenticated
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return null;  // Prevent rendering if redirecting
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to your Profile</Text>
    </View>
  );
}
