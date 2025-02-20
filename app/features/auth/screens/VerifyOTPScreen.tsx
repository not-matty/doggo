// app/features/auth/screens/VerifyOTPScreen.tsx

import React, { useState, useContext, useEffect } from 'react';
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
import { AuthContext } from '@context/AuthContext';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';
import Feather from 'react-native-vector-icons/Feather';

type VerifyOTPScreenRouteProp = RouteProp<AuthStackParamList, 'VerifyOTP'>;
type VerifyOTPScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'VerifyOTP'>;

type Props = {
  route: VerifyOTPScreenRouteProp;
};

const RESEND_COOLDOWN = 30; // seconds

const VerifyOTPScreen: React.FC<Props> = ({ route }) => {
  const { verifyOtp, signInWithPhone } = useContext(AuthContext);
  const navigation = useNavigation<VerifyOTPScreenNavigationProp>();
  const { phone } = route.params;
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
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
    if (!token.trim()) {
      Alert.alert('Invalid Token', 'Please enter the OTP sent to your phone.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(phone, token);
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
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (cooldown > 0) return;

    try {
      setLoading(true);
      await signInWithPhone(phone);
      setCooldown(RESEND_COOLDOWN);
      Alert.alert('Success', 'A new OTP has been sent to your phone.');
    } catch (error: any) {
      console.error('Resend OTP Error:', error);
      Alert.alert('Error', 'Failed to send new OTP. Please try again.');
    } finally {
      setLoading(false);
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
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.otpInputContainer}>
                <TextInput
                  placeholder="Enter OTP"
                  value={token}
                  onChangeText={setToken}
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

            <TouchableOpacity
              style={[
                styles.resendButton,
                (cooldown > 0 || loading) && styles.buttonDisabled
              ]}
              onPress={handleResendOTP}
              disabled={cooldown > 0 || loading}
            >
              <Text style={[
                styles.resendButtonText,
                (cooldown > 0 || loading) && styles.buttonDisabledText
              ]}>
                {cooldown > 0 ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
              </Text>
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
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
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
});

export default VerifyOTPScreen;
