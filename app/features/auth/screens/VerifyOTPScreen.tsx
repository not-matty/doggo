// app/features/auth/screens/VerifyOTPScreen.tsx

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';

type VerifyOTPScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyOTP'>;

type VerifyOTPScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'VerifyOTP'>;

type Props = {
  route: VerifyOTPScreenRouteProp;
  navigation: VerifyOTPScreenNavigationProp;
};

const VerifyOTPScreen: React.FC<Props> = ({ route }) => {
  const { verifyOtp } = useContext(AuthContext); // Corrected to 'verifyOtp'
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const { phone } = route.params;

  const [token, setToken] = useState('');

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert('Invalid Token', 'Please enter the OTP sent to your phone.');
      return;
    }

    try {
      await verifyOtp(phone, token); // Corrected to 'verifyOtp'
      // Upon successful verification, the AuthContext's listener will update the user state,
      // triggering RootNavigator to navigate to MainNavigator (Home screen)
    } catch (error: any) {
      console.error('OTP Verification Error:', error);
      let message = 'An error occurred during OTP verification.';

      if (error?.status === 400) {
        message = 'Invalid OTP. Please try again.';
      } else if (error?.status === 404) {
        message = 'OTP not found. Please request a new one.';
      }

      Alert.alert('Verification Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the OTP sent to {phone}</Text>
      <TextInput
        placeholder="OTP"
        value={token}
        onChangeText={setToken}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
      />
      <Button title="Verify" onPress={handleVerify} />
    </View>
  );
};

export default VerifyOTPScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderColor: '#555',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
    color: '#000',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
  },
});
