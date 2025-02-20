// app/features/auth/screens/CompleteProfileScreen.tsx

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';

type CompleteProfileScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'CompleteProfile'
>;

const MAX_BIO_LENGTH = 150;

const CompleteProfileScreen: React.FC = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const navigation = useNavigation<CompleteProfileScreenNavigationProp>();
  const [bio, setBio] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const handleCompleteProfile = async () => {
    if (!bio.trim()) {
      Alert.alert('Missing Information', 'Please enter a bio.');
      return;
    }

    setLoading(true);

    try {
      await updateProfile({
        id: user?.id || '',
        bio,
        profile_picture_url: profilePictureUrl || null,
      });
      Alert.alert('Success', 'Your profile has been updated.');

      // Navigate to the main app screen (MainNavigator) via the parent navigator.
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('MainNavigator');
      } else {
        // Fallback if getParent() returns null.
        navigation.navigate('MainNavigator' as any);
      }
    } catch (error: any) {
      console.error('Complete Profile Error:', error);
      Alert.alert(
        'Error',
        error.message || 'An error occurred while updating your profile.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ bio });
      // Navigation will be handled by AuthContext
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.bioHeader}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.charCount}>
                  {bio.length}/{MAX_BIO_LENGTH}
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={(text) => {
                  if (text.length <= MAX_BIO_LENGTH) {
                    setBio(text);
                  }
                }}
                placeholder="Write a short bio about yourself"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={MAX_BIO_LENGTH}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Profile Picture URL</Text>
              <TextInput
                placeholder="Enter image URL (optional)"
                value={profilePictureUrl}
                onChangeText={setProfilePictureUrl}
                style={styles.input}
                placeholderTextColor="#888"
                keyboardType="url"
                autoCapitalize="none"
                accessibilityLabel="Profile Picture URL Input"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default CompleteProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
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
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  charCount: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: typography.title.fontSize,
    fontWeight: '600',
  },
});
