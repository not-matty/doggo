// app/features/auth/screens/LoginScreen.tsx

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import CustomHeader from '@components/common/CustomHeader'; // Ensure this is correctly imported
import Footer from '@components/common/Footer'; // Optional: Import Footer if used

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { signInWithPassword } = useContext(AuthContext);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // Initialize phone with '+1 ' to include the country code
  const [phone, setPhone] = useState('+1 ');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    // Trim whitespace from phone and password
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    // Basic validation
    if (trimmedPhone.length <= 3) { // '+1 ' is 3 characters
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    if (!trimmedPassword) {
      Alert.alert('Missing Information', 'Please enter your password.');
      return;
    }

    try {
      await signInWithPassword(trimmedPhone, trimmedPassword);
      // The AuthContext's listener will navigate to MainNavigator upon successful sign-in
    } catch (error: any) {
      console.error(error);
      let message = 'An error occurred during sign in. Please try again.';

      if (error?.status === 400) {
        message = 'Invalid phone number or password.';
      } else if (error?.status === 404) {
        message = 'User not found.';
      }

      Alert.alert('Sign In Error', message);
    }
  };

  const handleCreateProfile = () => {
    navigation.navigate('Register');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Overlay Header */}
        <CustomHeader />

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>

            {/* Phone Number Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                placeholder="Enter your phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                placeholderTextColor="#888"
                maxLength={14} // Adjust based on your requirements
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
                placeholderTextColor="#888"
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.loginButton} onPress={handleSignIn} accessibilityLabel="Login">
              <Text style={styles.loginButtonText}>LOGIN</Text>
            </TouchableOpacity>

            {/* Signup Button */}
            <TouchableOpacity style={styles.signupButton} onPress={handleCreateProfile} accessibilityLabel="Sign Up">
              <Text style={styles.signupButtonText}>SIGN UP</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* Optional Footer */}
        {/* <Footer /> */}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // No additional padding to allow centering
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center', // Centers vertically
    paddingHorizontal: 30,
    paddingBottom: 40, // Optional: Adjust based on desired spacing from the bottom
  },
  formContainer: {
    // Additional styling can be added here if needed
  },
  title: {
    fontSize: 28,
    color: '#000',
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  signupButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
