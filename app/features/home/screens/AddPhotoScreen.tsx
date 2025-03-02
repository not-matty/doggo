// app/features/home/screens/AddPhotoScreen.tsx

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import { useClerkAuthContext } from '@context/ClerkAuthContext';
import { colors, spacing, typography, layout } from '@styles/theme';
import { useNavigation } from '@react-navigation/native';
import { optimizeImage } from '../../../utils/imageOptimizer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';

const AddPhotoScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Use both contexts, prioritizing the Clerk one
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();

  // Choose which auth context to use with safe null checking
  const contextUser = clerkAuthContext?.user || authContext?.user;
  const checkContactsPermission = clerkAuthContext?.checkContactsPermission || authContext?.checkContactsPermission;

  const navigation = useNavigation();
  const [cameraPermission, setCameraPermission] = useState(false);
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    openImagePicker();

    // Check for user ID from context or AsyncStorage
    const checkUserId = async () => {
      if (contextUser?.id) {
        setUserId(contextUser.id);
        return;
      }

      try {
        const storedProfileId = await AsyncStorage.getItem('profile_id');
        if (storedProfileId) {
          console.log('Using profile ID from AsyncStorage:', storedProfileId);
          setUserId(storedProfileId);
        } else {
          console.log('No user ID available, uploads will be disabled');
          Alert.alert(
            'Authentication Required',
            'You need to be logged in to upload photos.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('Error retrieving profile ID:', error);
      }
    };

    checkUserId();
  }, [contextUser?.id]);

  useEffect(() => {
    (async () => {
      // Request camera permissions right away
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');

      // Check for media library permissions
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setMediaLibraryPermission(mediaStatus === 'granted');

      // Don't request contacts permission immediately, this will happen at an appropriate time
    })();
  }, []);

  const openImagePicker = async () => {
    try {
      const permissionStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!permissionStatus.granted) {
        Alert.alert(
          'Permission Required',
          'This app needs access to your photo library to share photos.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1,
        exif: true,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open photo library');
      navigation.goBack();
    }
  };

  const handleAddPhoto = async () => {
    // Before accessing camera or library, check for contacts permission after auth
    try {
      if (contextUser) {
        console.log('Checking contacts permission before adding photo');
        const hasAuthenticated = await AsyncStorage.getItem(`hasAuthenticated_${contextUser.id}`);
        if (hasAuthenticated === 'true') {
          const hasImportedContacts = await AsyncStorage.getItem(`hasImportedContacts_${contextUser.id}`);
          if (hasImportedContacts === 'false') {
            console.log('User has not imported contacts yet, requesting permission');
            await checkContactsPermission();
          } else {
            console.log('User already has imported contacts, no need to request again');
          }
        } else {
          console.log('User not fully authenticated yet, skipping contacts check');
        }
      } else {
        console.log('No user found, skipping contacts check');
      }

      // Show modal for photo upload whether or not contacts were imported
      setModalVisible(true);
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      // Continue with photo upload even if contacts permission check fails
      setModalVisible(true);
    }
  };

  const handleUpload = async () => {
    const uploadUserId = userId || contextUser?.id;

    if (!selectedImage || !uploadUserId) {
      Alert.alert('Error', 'Unable to upload. Please try again after signing in.');
      navigation.goBack();
      return;
    }

    setUploading(true);
    try {
      console.log('Starting photo upload process for user ID:', uploadUserId);

      // Optimize the image
      const optimizedImage = await optimizeImage(selectedImage, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.9
      });

      const fileExt = optimizedImage.uri.split('.').pop();
      const fileName = `${uploadUserId}-${Date.now()}.${fileExt}`;
      console.log('Prepared file for upload:', fileName);

      // Create FormData for the image
      const formData = new FormData();
      formData.append('file', {
        uri: optimizedImage.uri,
        name: fileName,
        type: `image/${fileExt}`,
      } as any);

      // Upload to Supabase Storage
      console.log('Uploading to Supabase storage...');
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, formData);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage not configured. Please contact support.');
        }
        throw uploadError;
      }

      console.log('Image uploaded successfully to storage');

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        console.error('Failed to get public URL');
        throw new Error('Failed to get public URL');
      }

      console.log('Got public URL:', urlData.publicUrl);

      // Create photo record with all necessary fields
      const newPhoto = {
        user_id: uploadUserId,
        url: urlData.publicUrl,
        caption: caption.trim() || null,
        created_at: new Date().toISOString()
      };

      console.log('Inserting photo record:', newPhoto);
      const { data: insertData, error: insertError } = await supabase
        .from('photos')
        .insert([newPhoto])
        .select();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error('Failed to save photo information');
      }

      console.log('Photo record created successfully:', insertData);

      // Show success message
      Alert.alert('Success', 'Photo uploaded successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  if (!selectedImage) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Image
            source={{ uri: selectedImage }}
            style={styles.image}
            resizeMode="contain"
          />

          <View style={styles.captionContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={colors.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={2200}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, uploading && styles.buttonDisabled]}
              onPress={handleAddPhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>Share</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surface,
  },
  captionContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  captionInput: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    minHeight: 100,
  },
  buttonContainer: {
    padding: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: typography.title.fontWeight,
  },
});

export default AddPhotoScreen;
