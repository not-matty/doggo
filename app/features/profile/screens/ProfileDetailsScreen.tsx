// app/features/profile/screens/ProfileDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Image,
  Dimensions,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '@services/supabase';
import { SearchStackParamList, User, Photo } from '@navigation/types';
import Feather from 'react-native-vector-icons/Feather';

type ProfileDetailsRouteProp = RouteProp<SearchStackParamList, 'ProfileDetails'>;

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width / 2) - 20;

const ProfileDetailsScreen: React.FC = () => {
  const route = useRoute<ProfileDetailsRouteProp>();
  const navigation = useNavigation();
  const { userId } = route.params;

  const [profile, setProfile] = useState<User | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [liking, setLiking] = useState<boolean>(false);

  useEffect(() => {
    fetchUserProfileAndPhotos();
  }, []);

  const fetchUserProfileAndPhotos = async () => {
    setLoading(true);
    try {
      // 1) Fetch profile data
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // 2) Fetch user photos
      let { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      setProfile(profileData as User);
      setPhotos(photosData as Photo[]);
    } catch (err: any) {
      console.error('Error fetching profile or photos:', err);
      Alert.alert('Error', 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!profile) return;
    setLiking(true);

    try {
      // Increment likes in "profiles" table
      const newLikesCount = profile.likes + 1;
      const { error } = await supabase
        .from('profiles')
        .update({ likes: newLikesCount })
        .eq('id', profile.id);

      if (error) throw error;

      // Update local state
      setProfile({ ...profile, likes: newLikesCount });
    } catch (error: any) {
      console.error('Error updating likes:', error);
      Alert.alert('Error', 'Failed to update likes.');
    } finally {
      setLiking(false);
    }
  };

  const renderItem = ({ item }: { item: Photo }) => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.text}>User not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Row: Avatar + Name + Like Button */}
      <View style={styles.userInfoContainer}>
        <Image
          source={{ uri: profile.profile_picture_url || 'https://via.placeholder.com/50' }}
          style={styles.profileImage}
        />
        <View style={styles.nameLikeContainer}>
          <Text style={styles.userName}>{profile.name}</Text>
          <TouchableOpacity
            onPress={handleLike}
            disabled={liking}
            style={styles.likeButton}
            accessibilityLabel="Like User"
          >
            <Feather name="heart" size={20} color="#fff" />
            <Text style={styles.likeCount}>{profile.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Grid */}
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 10 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default ProfileDetailsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // VSCO-like black background
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  nameLikeContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  imageContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    margin: 5,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});
