import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ProfilePage = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    // Check if the selection was canceled and if the assets array has at least one item
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={profileImage ? { uri: profileImage } : require('../../../assets/images/Default_pfp.svg.png')}
            style={styles.profileImage}
          />
        </TouchableOpacity>
        <Text style={styles.username}>Username</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: '#f0f0f0', padding: 20 },
  profileContainer: { alignItems: 'center', marginBottom: 20 },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,  // Keeps the image displayed in a circle
    backgroundColor: '#ccc', // Gray background for default
  },
  username: { fontSize: 20, fontWeight: '600', marginTop: 10, color: '#333' },
});

export default ProfilePage;
