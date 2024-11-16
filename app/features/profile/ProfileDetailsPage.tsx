import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ProfileStackParamList } from '@navigation/types';
import CustomHeader from '@components/common/CustomHeader';
import { supabase } from '@services/supabase';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;

const ProfileDetailsPage: React.FC = () => {
  const route = useRoute<ProfileDetailsRouteProp>();
  const { userId } = route.params;
  const [liked, setLiked] = useState(false);
  const [user, setUser] = useState<any>(null); // Replace 'any' with actual user type

  useEffect(() => {
    const fetchUserDetails = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user details:', error);
      } else {
        setUser(data);
      }
    };

    fetchUserDetails();
  }, [userId]);

  const toggleLike = () => {
    setLiked(!liked);
    // Optionally, update like status in Supabase
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading user details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <CustomHeader title="Profile Details" showBackButton={true} />

      {/* Profile Details Content */}
      <View style={styles.content}>
        <Text style={styles.detailText}>User ID: {user.id}</Text>
        <Text style={styles.detailText}>Name: {user.name}</Text>
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
    marginVertical: 5,
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
  text: {
    color: '#333',
    fontSize: 18,
  },
});

export default ProfileDetailsPage;
