// app/features/profile/ProfilePage.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { ProfileStackParamList, User } from '@navigation/types';
import { demoProfiles } from '@data/demoProfiles';
import { supabase } from '@services/supabase';

type ProfilePageRouteProp = RouteProp<ProfileStackParamList, 'ProfilePage'>;

const { width } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Must match other components

const ProfilePage: React.FC = () => {
  const route = useRoute<ProfilePageRouteProp>();
  const { userId } = route.params;
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user:', error);
        // Fallback to demo profiles if needed
        const demoUser = demoProfiles.find((profile) => profile.id === userId);
        setUser(demoUser);
      } else {
        setUser(data as User);
      }
    };

    fetchUser();
  }, [userId]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading user...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={user.photos[0]} style={styles.image} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{user.name}</Text>
        {/* Add more user details here */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: SEARCH_BAR_HEIGHT,
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: 15,
    resizeMode: 'cover',
    marginTop: 20,
  },
  infoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  name: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});

export default ProfilePage;
