// app/features/auth/screens/LoginScreen.tsx

import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';
import Feather from 'react-native-vector-icons/Feather';
import { useSignIn, useAuth } from '@clerk/clerk-expo';
import { supabase } from '@services/supabase';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { userId } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('1');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

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
    const cleaned = text.replace(/\D/g, '');
    setCountryCode(cleaned.slice(0, 4));
  };

  const handleSignIn = async () => {
    if (!isLoaded) return;

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
      setLoading(true);

      await signIn.create({
        identifier: fullPhoneNumber,
        strategy: "phone_code",
      });

      setPendingVerification(true);
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert(
        'Sign In Error',
        error.message || 'Failed to send verification code'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Invalid Code', 'Please enter the verification code.');
      return;
    }

    try {
      setLoading(true);

      // Attempt to verify the code
      const result = await signIn!.attemptFirstFactor({
        strategy: "phone_code",
        code
      });

      if (!result.createdSessionId) {
        throw new Error('Failed to create session');
      }

      // Set the session active
      await setActive!({ session: result.createdSessionId });

      // Update the existing profile with the new Clerk ID
      const cleanedPhone = phone.replace(/\D/g, '');
      const fullPhoneNumber = `+${countryCode}${cleanedPhone}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          clerk_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('phone', fullPhoneNumber);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        // Continue anyway as this isn't critical
      }

    } catch (error: any) {
      console.error('Verification error:', error);
      console.error('Verification error details:', error.errors?.[0] || error);
      Alert.alert(
        'Verification Failed',
        error.errors?.[0]?.message || 'Failed to verify code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderVerificationForm = () => (
    <View style={styles.content}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Verify Phone</Text>
        <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter verification code"
            value={code}
            onChangeText={setCode}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.loginButtonText}>Verify Phone</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSignInForm = () => (
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
            maxLength={14}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.loginButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );

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

          {pendingVerification ? renderVerificationForm() : renderSignInForm()}
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
  inputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xl,
  },
  input: {
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
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: colors.background,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
});

export default LoginScreen;
