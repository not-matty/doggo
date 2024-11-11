// app/features/auth/LoginPage.tsx

import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Footer from '@components/common/Footer'; // If applicable
import globalStyles from '@styles/globalStyles';

const LoginPage: React.FC = () => {
  const navigation = useNavigation();

  const handleLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs' }],
    });
  };

  return (
    <View style={globalStyles.container}>
      {/* Removed CustomHeader */}
      <View style={styles.content}>
        {/* Add any content you want here */}
        {/* For example, a logo or welcome message */}
        <Button title="Login" onPress={handleLogin} />
      </View>
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LoginPage;
