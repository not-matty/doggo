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
  SafeAreaView,
} from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';
import Feather from 'react-native-vector-icons/Feather';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { signInWithPhone } = useContext(AuthContext);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('1');

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    // Format as (XXX) XXX-XXXX
    if (cleaned.length > 0) {
      if (cleaned.length <= 3) {
        formatted = `(${cleaned}`;
      } else if (cleaned.length <= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      } else {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      }
    }

    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhoneNumber(text));
  };

  const handleCountryCodeChange = (text: string) => {
    // Remove non-numeric characters and limit to 4 digits
    const cleaned = text.replace(/\D/g, '');
    setCountryCode(cleaned.slice(0, 4));
  };

  const handleSignIn = async () => {
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a complete phone number.');
      return;
    }

    if (!countryCode) {
      Alert.alert('Invalid Country Code', 'Please enter a country code.');
      return;
    }

    const fullPhoneNumber = `+${countryCode}${cleanedPhone}`;

    try {
      await signInWithPhone(fullPhoneNumber);
      navigation.navigate('VerifyOTP', { phone: fullPhoneNumber });
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert('Sign In Error', 'Failed to send verification code. Please try again.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={28} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Enter your phone number to continue</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.plus}>+</Text>
                <TextInput
                  value={countryCode}
                  onChangeText={handleCountryCodeChange}
                  keyboardType="phone-pad"
                  style={styles.countryCode}
                  maxLength={4}
                  selectTextOnFocus
                />
                <TextInput
                  placeholder="(123) 456-7890"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={14} // (XXX) XXX-XXXX
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleSignIn}
            >
              <Text style={styles.loginButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  backButton: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  headerContainer: {
    marginBottom: spacing.xl * 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
  },
  plus: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  countryCode: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
    width: 45,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primary,
    paddingVertical: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginButtonText: {
    color: colors.background,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
});

export default LoginScreen;
