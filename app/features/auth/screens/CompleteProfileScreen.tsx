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
} from 'react-native';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';

type CompleteProfileScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'CompleteProfile'
>;

const CompleteProfileScreen: React.FC = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const navigation = useNavigation<CompleteProfileScreenNavigationProp>();

  const [bio, setBio] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Complete Your Profile</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          placeholder="Tell us about yourself"
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
          accessibilityLabel="Bio Input"
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
        style={styles.completeButton}
        onPress={handleCompleteProfile}
        disabled={loading}
        accessibilityLabel="Complete Profile Button"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

export default CompleteProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    color: '#000',
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 25,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  completeButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
