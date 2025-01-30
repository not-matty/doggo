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
} from 'react-native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

const AddPhotoScreen: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();

  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [uploading, setUploading] = useState(false);

  // Open the user’s photo library
  const pickImage = async () => {
    try {
      // Display a debug message to confirm button press
      console.log('Pick Image button pressed');

      const result = await launchImageLibrary({
        mediaType: 'photo',
        includeBase64: false,
      });

      if (result.didCancel) {
        console.log('User cancelled picker');
        return;
      } else if (result.errorCode) {
        console.log('Image Picker Error:', result.errorMessage);
        Alert.alert('Image Picker Error', result.errorMessage || 'Unknown error');
        return;
      } else if (result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (err) {
      console.error('pickImage error:', err);
      Alert.alert('Error', 'Unexpected error opening image picker.');
    }
  };

  // Upload the image to Supabase
  const handleUpload = async () => {
    if (!selectedImage?.uri) {
      Alert.alert('No Image Selected', 'Please select an image to upload.');
      return;
    }
    setUploading(true);

    try {
      const uri = selectedImage.uri;
      // Generate a unique file name
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

      // Convert the image to a Blob (this may fail if URI is "ph://")
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: selectedImage.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) throw new Error('Failed to retrieve public URL');
      const publicUrl = urlData.publicUrl;

      // Insert record in "photos" table
      const { error: insertError } = await supabase
        .from('photos')
        .insert([{ url: publicUrl, user_id: user?.id }]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Photo uploaded successfully!');
      navigation.goBack();
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', error.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Pick Image Button */}
        <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
          <Feather name="upload" size={20} color="#fff" />
          <Text style={styles.pickButtonText}>Pick a Photo</Text>
        </TouchableOpacity>

        {/* Preview the selected image */}
        {selectedImage?.uri && (
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.image}
            resizeMode="cover"
          />
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>Upload Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddPhotoScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickButton: {
    flexDirection: 'row',
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  pickButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: 220,
    height: 220,
    borderRadius: 10,
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    width: '60%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
