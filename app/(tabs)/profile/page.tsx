// app/(tabs)/profile/page.tsx

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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
        <Image
          source={profileImage ? { uri: profileImage } : require('../../../assets/images/Default_pfp.svg.png')}
          style={styles.profileImage}
        />
      </TouchableOpacity>
      <Text style={styles.username}>Username</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#fff', // Clean background
  },
  imageWrapper: {
    // No additional styling needed; removed borders and padding
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,  // Circle shape
    backgroundColor: '#ccc', // Gray background for default
  },
  username: { 
    fontSize: 20, 
    fontWeight: '600', 
    marginTop: 10, 
    color: '#333' // Dark text
  },
});

export default ProfilePage;
