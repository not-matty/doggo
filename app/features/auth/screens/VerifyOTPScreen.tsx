// app/features/auth/screens/VerifyOTPScreen.tsx

import React, { useState, useEffect } from 'react';
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
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';
import Feather from 'react-native-vector-icons/Feather';
import { useSignIn } from '@clerk/clerk-expo';

type VerifyOTPScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyOTP'>;
type VerifyOTPScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'VerifyOTP'>;

type Props = {
  route: VerifyOTPScreenRouteProp;
};

const RESEND_COOLDOWN = 60; // changed from 30 to 60 seconds

const VerifyOTPScreen: React.FC<Props> = ({ route }) => {
  const { signIn, setActive } = useSignIn();
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Start the cooldown timer immediately when component mounts
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

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

      // Set the session active
      await setActive!({ session: result.createdSessionId });

      // The RootNavigator will automatically navigate to the main app
      // when the auth state changes
    } catch (error: any) {
      console.error('Verification Error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Failed to verify code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;

    try {
      setResending(true);
      await signIn!.create({
        identifier: phone,
        strategy: "phone_code",
      });
      setCooldown(RESEND_COOLDOWN);
      Alert.alert('Success', 'A new verification code has been sent.');
    } catch (error: any) {
      console.error('Resend Code Error:', error);
      Alert.alert('Error', 'Failed to send new code. Please try again.');
    } finally {
      setResending(false);
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
              <Text style={styles.title}>Verify Code</Text>
              <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.otpInputContainer}>
                <TextInput
                  placeholder="Enter verification code"
                  value={code}
                  onChangeText={setCode}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.textSecondary}
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.verifyButtonText}>Verify</Text>
              )}
            </TouchableOpacity>

            {cooldown > 0 ? (
              <View style={styles.cooldownContainer}>
                <Text style={styles.cooldownText}>
                  Resend code available in {cooldown}s
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.resendButton, resending && styles.buttonDisabled]}
                onPress={handleResendCode}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.resendButtonText}>Resend Verification Code</Text>
                )}
              </TouchableOpacity>
            )}
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
  otpInputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: spacing.sm,
  },
  otpInput: {
    fontSize: 24,
    color: colors.primary,
    paddingVertical: spacing.sm,
    textAlign: 'center',
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  resendButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  verifyButtonText: {
    color: colors.background,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
  resendButtonText: {
    color: colors.primary,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonDisabledText: {
    color: colors.textSecondary,
  },
  cooldownContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  cooldownText: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
});

export default VerifyOTPScreen;
