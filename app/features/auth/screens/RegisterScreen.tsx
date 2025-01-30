// app/features/auth/screens/RegisterScreen.tsx

import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const { signUpWithPhone } = useContext(AuthContext);
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [phone, setPhone] = useState('+1 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState(''); // Added username state
  const [loading, setLoading] = useState<boolean>(false);

  const phoneInputRef = useRef<TextInput>(null);

  /**
   * Ensures that the phone number always starts with "+1 ".
   * Prevents users from deleting or altering the country code.
   */
  const handlePhoneChange = (text: string) => {
    if (!text.startsWith('+1 ')) {
      // If the user tries to remove or change the country code, reset it to "+1 "
      setPhone('+1 ');
      return;
    }
    setPhone(text);
  };

  const handleSignUp = async () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Missing Information', 'Please enter a username.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number.');
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing Information', 'Please enter and confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    // Optional: Add more robust validation here (e.g., phone number format, password strength)

    setLoading(true);

    try {
      await signUpWithPhone(phone, password, name, username); // Pass username
      // The AuthContext's listener will navigate to VerifyOTP upon successful sign-up
    } catch (error: any) {
      console.error(error);
      let message = 'An error occurred during registration. Please try again.';

      if (error?.status === 400) {
        message = 'Invalid phone number or password.';
      } else if (error?.status === 409) {
        message = 'Phone number or username already in use.';
      }

      Alert.alert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholderTextColor="#888"
          autoCapitalize="words"
          accessibilityLabel="Name Input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          placeholder="Choose a username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          placeholderTextColor="#888"
          autoCapitalize="none"
          accessibilityLabel="Username Input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          ref={phoneInputRef}
          placeholder="+1 1234567890"
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#888"
          maxLength={16} // +1 followed by 14 characters (including space)
          accessibilityLabel="Phone Number Input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#888"
          accessibilityLabel="Password Input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          placeholder="Confirm your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#888"
          accessibilityLabel="Confirm Password Input"
        />
      </View>

      <TouchableOpacity
        style={styles.registerButton}
        onPress={handleSignUp}
        disabled={loading}
        accessibilityLabel="Register Button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>Register</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginButton} onPress={handleNavigateToLogin} accessibilityLabel="Login Button">
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    color: '#000',
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 40,
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
  registerButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#000',
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
