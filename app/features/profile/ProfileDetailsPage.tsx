// app/features/profile/ProfileDetailsPage.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ProfileStackParamList } from '@navigation/types'; // Ensure correct path alias
import CustomHeader from '@components/common/CustomHeader';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;

const ProfileDetailsPage: React.FC = () => {
  const route = useRoute<ProfileDetailsRouteProp>();
  const { userId } = route.params;
  const [liked, setLiked] = useState(false);

  const toggleLike = () => {
    setLiked(!liked);
  };

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <CustomHeader title="Profile Details" showBackButton={true} />

      {/* Profile Details Content */}
      <View style={styles.content}>
        <Text style={styles.detailText}>User ID: {userId}</Text>
        {/* Add more profile details here */}
        <TouchableOpacity onPress={toggleLike} style={styles.likeButton}>
          <Text style={[styles.likeButtonText, { color: liked ? '#D32F2F' : '#000' }]}>
            {liked ? '♥ Liked' : '♡ Like'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  detailText: {
    fontSize: 20,
    color: '#333',
  },
  likeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#FFCDD2',
  },
  likeButtonText: {
    fontSize: 18,
  },
});

export default ProfileDetailsPage;
