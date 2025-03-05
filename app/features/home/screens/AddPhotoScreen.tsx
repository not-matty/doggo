// app/features/home/screens/AddPhotoScreen.tsx

import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
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
  Modal,
  ScrollView,
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
import * as FileSystem from 'expo-file-system';

const AddPhotoScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use both contexts, prioritizing the Clerk one
  const authContext = useContext(AuthContext);
  const clerkAuthContext = useClerkAuthContext();

  // Choose which auth context to use with safe null checking
  const contextUser = clerkAuthContext?.user || authContext?.user;

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
    })();
  }, []);

  const openImagePicker = useCallback(async () => {
    try {
      const permissionStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!permissionStatus.granted) {
        Alert.alert(
          'Permission Required',
          'This app needs access to your photo library to share photos.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open photo library');
    }
  }, []);

  // Simple function to generate a pseudo-random ID that doesn't rely on crypto
  const generateUniqueId = () => {
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is 8, 9, a, or b
    const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    return template.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Utility function to prepare file for upload
  const prepareFileForUpload = async (uri: string): Promise<Blob> => {
    try {
      // Ensure we have a valid URI
      if (!uri) throw new Error('Invalid file URI');

      console.log(`Original URI: ${uri}`);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error(`File does not exist at path: ${uri}`);
      }

      console.log(`File exists, size: ${fileInfo.size} bytes`);

      // In React Native, we need a different approach for blob creation
      // First, read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (!base64) {
        throw new Error('Failed to read file as base64');
      }

      console.log(`Successfully read file as base64, length: ${base64.length}`);

      // For Supabase, use a simpler approach to create the blob
      // by decoding base64 to binary
      const binary = atob(base64);
      const array = [];
      for (let i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }

      // Create blob from array buffer
      const blob = new Blob([new Uint8Array(array)], { type: 'image/jpeg' });

      if (!blob || blob.size === 0) {
        throw new Error('Generated blob is empty');
      }

      console.log(`Successfully created blob with size ${blob.size} bytes`);
      return blob;
    } catch (error: any) {
      console.error('Error preparing file:', error);
      throw new Error(`Failed to prepare file: ${error.message || 'Unknown error'}`);
    }
  };

  const uploadPhoto = useCallback(async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Unable to upload. Please try again after signing in.');
      return;
    }

    setUploading(true);
    setLoadingStage('Optimizing image...');
    setUploadProgress(10);

    try {
      // Use our custom function instead of uuidv4()
      let photoId;
      try {
        photoId = generateUniqueId();
      } catch (idError) {
        console.error('Error generating photo ID:', idError);
        // Fallback to simple timestamp-based ID if UUID generation fails
        photoId = `photo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      const fileExt = selectedImage.split('.').pop();
      const fileName = `${photoId}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Optimize the image before uploading
      setLoadingStage('Processing image...');
      setUploadProgress(30);
      const optimizedImage = await optimizeImage(selectedImage, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8
      });

      // Prepare the file for upload using our utility function
      setLoadingStage('Preparing file for upload...');
      setUploadProgress(40);

      // Try a different approach - read file directly from path
      const fileContent = await FileSystem.readAsStringAsync(optimizedImage.uri, {
        encoding: FileSystem.EncodingType.Base64
      });

      if (!fileContent) {
        throw new Error('Failed to read image file');
      }

      console.log(`Read file of length: ${fileContent.length}`);
      setUploadProgress(45);

      // Convert base64 to Uint8Array for upload
      const binary = atob(fileContent);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }

      // Upload to Supabase
      setLoadingStage('Uploading to storage...');
      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, array, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage not configured. Please contact support.');
        }
        throw uploadError;
      }

      // Get the public URL
      setLoadingStage('Processing upload...');
      setUploadProgress(70);
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error('Failed to get public URL');
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Save the photo information to the database
      setLoadingStage('Saving photo data...');
      setUploadProgress(90);
      const { error: insertError } = await supabase
        .from('photos')
        .insert({
          id: photoId,
          url: urlData.publicUrl,
          user_id: userId,
          caption: caption.trim() || null
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        // Try to clean up the uploaded file
        try {
          await supabase.storage
            .from('posts')
            .remove([filePath]);
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError);
        }

        throw new Error('Failed to save photo information');
      }

      // Success! Go back to home screen
      setLoadingStage('Upload complete!');
      setUploadProgress(100);
      Alert.alert('Success', 'Photo uploaded successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setLoadingStage('');
    }
  }, [selectedImage, caption, userId, uploading, uploadProgress, loadingStage, openImagePicker]);

  // Memoize the content to prevent unnecessary re-renders
  const renderContent = useMemo(() => {
    if (uploading) {
      return (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.uploadingText}>{loadingStage}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{uploadProgress}%</Text>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.changePhotoButton}
                  onPress={openImagePicker}
                >
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.placeholderContainer}
                onPress={openImagePicker}
              >
                <Text style={styles.placeholderText}>Tap to select a photo</Text>
              </TouchableOpacity>
            )}

            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor={colors.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={150}
              />
              <Text style={styles.characterCount}>
                {caption.length}/150
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  (!selectedImage || !userId) && styles.disabledButton
                ]}
                onPress={uploadPhoto}
                disabled={!selectedImage || !userId}
              >
                <Text style={styles.uploadButtonText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }, [selectedImage, caption, userId, uploading, uploadProgress, loadingStage, openImagePicker]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Post</Text>
      </View>
      {renderContent}
    </SafeAreaView>
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
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  uploadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '80%',
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 5,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    marginTop: 5,
    fontSize: 14,
    color: colors.textSecondary,
  },
  imagePreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  changePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  changePhotoText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  cancelButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: colors.background,
    fontSize: typography.body.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  inner: {
    flex: 1,
  },
});

export default AddPhotoScreen;
