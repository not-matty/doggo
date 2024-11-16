// app/components/common/UserItem.tsx

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList, Profile } from '@navigation/types';
import PhotoCarousel from '@components/common/PhotoCarousel';

type UserItemProps = {
  profile: Profile;
};

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70;

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfilePage'>;

const UserItem: React.FC<UserItemProps> = ({ profile }) => {
  const navigation = useNavigation<NavigationProp>();

  const navigateToProfile = () => {
    navigation.navigate('ProfilePage', { userId: profile.id });
  };

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={navigateToProfile} activeOpacity={0.9}>
      <PhotoCarousel photos={profile.photos} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width,
    height: height - SEARCH_BAR_HEIGHT - 60,
    backgroundColor: '#000',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  name: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '600',
  },
});

export default UserItem;
