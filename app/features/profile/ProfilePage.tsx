// app/features/profile/ProfilePage.tsx

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '@/navigation/types';
import CustomHeader from '@components/common/CustomHeader';


type ProfilePageNavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfilePage'>;

const ProfilePage: React.FC = () => {
  const navigation = useNavigation<ProfilePageNavigationProp>();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const pickImage = async () => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleUsernamePress = () => {
    // Navigate to Profile Details Page
    navigation.navigate('ProfileDetails', { userId: '123' }); // Example userId
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Profile" showBackButton={false} />
      <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
        <Image
          source={
            profileImage
              ? { uri: profileImage }
              : require('@assets/images/Default_pfp.svg.png')
          }
          style={styles.profileImage}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleUsernamePress}>
        <Text style={styles.username}>Username</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  imageWrapper: {
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,  // Circle shape
    backgroundColor: '#ccc', // Gray background for default
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333', // Dark text
  },
});

export default ProfilePage;
