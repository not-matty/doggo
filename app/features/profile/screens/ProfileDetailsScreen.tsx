// app/features/profile/screens/ProfileDetailsScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '@services/supabase';
import { ProfileStackParamList } from '@navigation/types';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type ProfileDetailsRouteProp = RouteProp<ProfileStackParamList, 'ProfileDetails'>;

type Props = {
  route: ProfileDetailsRouteProp;
  navigation: StackNavigationProp<ProfileStackParamList, 'ProfileDetails'>;
};

const ProfileDetailsScreen: React.FC<Props> = ({ route }) => {
  const { userId } = route.params;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile.');
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profile not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: profile.photo }} style={styles.profileImage} />
      <Text style={styles.name}>{profile.name}</Text>
      {/* Add more profile details as needed */}
    </ScrollView>
  );
};

export default ProfileDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
});
