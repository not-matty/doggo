// app/features/auth/screens/RegisterScreen.tsx

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
import { useSignUp } from '@clerk/clerk-expo';
import { supabase } from '@services/supabase';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const { signUp, isLoaded, setActive } = useSignUp();
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('1');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const checkExistingUsername = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  const cleanupIncompleteSignUp = async () => {
    try {
      // Clean up any pending profile in Supabase if needed
      const cleanedPhone = phone.replace(/\D/g, '');
      const fullPhoneNumber = `+${countryCode}${cleanedPhone}`;

      await supabase
        .from('profiles')
        .delete()
        .eq('phone', fullPhoneNumber)
        .eq('is_placeholder', true);
    } catch (error) {
      console.error('Error cleaning up incomplete sign-up:', error);
    }
  };

  const handleSignUp = async () => {
    if (!isLoaded) return;

    // Validate name
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }

    // Validate username
    if (!username.trim()) {
      Alert.alert('Missing Information', 'Please enter a username.');
      return;
    }

    // Validate password
    if (!password || password.length < 8) {
      Alert.alert('Invalid Password', 'Password must be at least 8 characters long.');
      return;
    }

    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      Alert.alert(
        'Invalid Username',
        'Username must be 3-20 characters long and can only contain letters, numbers, underscores (_), and hyphens (-).'
      );
      return;
    }

    // Validate phone
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a complete phone number.');
      return;
    }

    if (!countryCode) {
      Alert.alert('Invalid Country Code', 'Please enter a country code.');
      return;
    }

    try {
      setLoading(true);

      // Clean up any previous incomplete sign-ups
      await cleanupIncompleteSignUp();

      // Check if username exists in Supabase first
      const usernameExists = await checkExistingUsername(username);
      if (usernameExists) {
        Alert.alert(
          'Username Taken',
          'This username is already taken. Please choose a different username.'
        );
        return;
      }

      const fullPhoneNumber = `+${countryCode}${cleanedPhone}`;

      await signUp.create({
        phoneNumber: fullPhoneNumber,
        username: username.toLowerCase(),
        password
      });

      await signUp.preparePhoneNumberVerification();
      setPendingVerification(true);
    } catch (error: any) {
      console.error('Sign up error:', error);
      await cleanupIncompleteSignUp();

      if (error.errors?.[0]?.code === 'form_identifier_exists') {
        Alert.alert(
          'Phone Number Taken',
          'This phone number is already registered. Please use a different number or sign in.'
        );
      } else if (error.errors?.[0]?.code === 'form_param_format_invalid') {
        Alert.alert(
          'Invalid Format',
          'Please check your phone number format and try again.'
        );
      } else {
        Alert.alert(
          'Sign Up Error',
          error.message || 'Failed to create account'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateProfile = async (clerkId: string, phone: string, name: string, username: string) => {
    try {
      // First check if profile exists with this phone number
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }

      if (existingProfile) {
        // Update existing profile with new Clerk ID
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            clerk_id: clerkId,
            name,
            username,
            updated_at: new Date().toISOString()
          })
          .eq('phone', phone);

        if (updateError) throw updateError;
        return existingProfile.id;
      } else {
        // Create new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            clerk_id: clerkId,
            name,
            username,
            phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newProfile.id;
      }
    } catch (error) {
      console.error('Error in createOrUpdateProfile:', error);
      throw error;
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
      const result = await signUp!.attemptPhoneNumberVerification({
        code,
      });

      if (!result.createdUserId || !result.createdSessionId) {
        throw new Error('Failed to create user or session');
      }

      // Create or update the Supabase profile
      console.log('Creating/updating Supabase profile for user:', result.createdUserId);
      await createOrUpdateProfile(
        result.createdUserId,
        phone,
        name,
        username.toLowerCase()
      );

      // Set the session active
      await setActive!({ session: result.createdSessionId });

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
        style={[styles.signupButton, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.signupButtonText}>Verify Phone</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSignUpForm = () => (
    <View style={styles.content}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Fill in your details to get started</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

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
        style={[styles.signupButton, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.signupButtonText}>Create Account</Text>
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

          {pendingVerification ? renderVerificationForm() : renderSignUpForm()}
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xl,
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
  signupButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: colors.background,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
});

export default RegisterScreen;

