// AddPhotoScreen.tsx

import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker'; // Native photo picker
import { supabase } from '@services/supabase'; // Correctly imported Supabase client
import { AuthContext } from '@context/AuthContext'; // Ensure AuthContext is correctly imported
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { MainStackParamList } from '@navigation/types'; // Adjust based on your navigation setup
import Feather from 'react-native-vector-icons/Feather'; // Ensure Feather is installed

type AddPhotoScreenNavigationProp = NavigationProp<MainStackParamList, 'AddPhoto'>;

const AddPhotoScreen: React.FC = () => {
  const { user } = useContext(AuthContext); // Ensure AuthContext provides 'user'
  const navigation = useNavigation<AddPhotoScreenNavigationProp>();
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Function to handle image selection
  const pickImage = async () => {
    try {
      console.log('Pick Image button pressed'); // Debugging line

      const options = {
        mediaType: 'photo' as const,
        includeBase64: false,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      } else if (result.errorCode) {
        console.log('Image Picker Error:', result.errorMessage);
        Alert.alert('Image Picker Error', result.errorMessage || 'Unknown error');
        return;
      } else if (result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('Error', 'An unexpected error occurred while selecting the image.');
    }
  };

  // Function to handle image upload
  const handleUpload = async () => {
    if (!selectedImage || !selectedImage.uri) {
      Alert.alert('No Image Selected', 'Please select an image to upload.');
      return;
    }

    setUploading(true);

    try {
      // Generate a unique file name using user ID and timestamp
      const fileName = `${user?.id}-${Date.now()}.${selectedImage.uri.split('.').pop()}`;

      // Upload the image to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('photos') // Ensure you have a 'photos' bucket in Supabase Storage
        .upload(fileName, selectedImage.uri, {
          contentType: selectedImage.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Retrieve the public URL of the uploaded image
      const { data } = supabase
        .storage
        .from('photos')
        .getPublicUrl(fileName);

      if (!data || !data.publicUrl) {
        throw new Error('Failed to retrieve public URL.');
      }

      const publicUrl = data.publicUrl;

      // Insert a record into the 'photos' table with the image URL and user ID
      const { error: insertError } = await supabase
        .from('photos')
        .insert([
          { url: publicUrl, user_id: user?.id }, // Adjust fields as per your table schema
        ]);

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Success', 'Photo uploaded successfully!');
      navigation.goBack(); // Navigate back to HomeScreen
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Upload Error', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.safeArea}>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formContainer}>
            {/* Pick Image Button */}
            <TouchableOpacity
              style={styles.pickButton}
              onPress={pickImage}
              accessibilityLabel="Pick an Image"
            >
              <Feather name="upload" size={20} color="#fff" />
              <Text style={styles.pickButtonText}>Pick a Photo</Text>
            </TouchableOpacity>

            {/* Display Selected Image */}
            {selectedImage && selectedImage.uri && (
              <Image source={{ uri: selectedImage.uri }} style={styles.image} />
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}
              disabled={uploading}
              accessibilityLabel="Upload Photo"
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload Photo</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default AddPhotoScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // Transparent background
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 10,
    color: '#000',
  },
  container: {
    flex: 1,
    justifyContent: 'center', // Center vertically
    paddingHorizontal: 30,
    paddingTop: 60, // To prevent overlap with header
  },
  formContainer: {
    alignItems: 'center',
  },
  pickButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    width: '100%',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
