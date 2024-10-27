// app/login/page.tsx
import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    // After login, navigate to the home screen
    router.replace('/home/page');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>doggo</Text>
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
});
