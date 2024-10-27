import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ProfilePage = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Set aspect ratio to 1:1 for a square image
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={pickImage}>
          <View style={styles.imageFrame}>
            <Image
              source={profileImage ? { uri: profileImage } : require('../../assets/images/Default_pfp.svg.png')}
              style={styles.profileImage}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.username}>Username</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#f0f0f0', padding: 20 },
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  imageFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden', // Ensures the image stays within the circular frame
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Ensures the image covers the frame area
  },
  username: { fontSize: 20, fontWeight: '600', marginTop: 10, color: '#333' },
});

export default ProfilePage;
