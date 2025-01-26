// UserItem.tsx

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList, Profile } from '@navigation/types';
import PhotoCarousel from '@components/common/PhotoCarousel';

type UserItemProps = {
  profile: Profile;
};

const { width, height } = Dimensions.get('window');
const SEARCH_BAR_HEIGHT = 70; // Consider passing this as a prop or managing layout globally

type NavigationType = StackNavigationProp<ProfileStackParamList, 'ProfilePage'>;

const UserItem: React.FC<UserItemProps> = ({ profile }) => {
  const navigation = useNavigation<NavigationType>();

  const navigateToProfile = () => {
    navigation.navigate('ProfilePage', { userId: profile.id });
  };

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={navigateToProfile}
      activeOpacity={0.8}
      accessibilityLabel={`View profile of ${profile.name}`}
    >
      {profile.photos && profile.photos.length > 0 ? (
        <PhotoCarousel photos={profile.photos} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No Photos Available</Text>
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: width,
    height: height - SEARCH_BAR_HEIGHT - 60, // Consider using flex properties instead
    backgroundColor: '#fff', // Changed to white for consistency
    marginBottom: 10, // Added margin for spacing between items
    borderRadius: 15, // Added border radius for a smoother look
    overflow: 'hidden', // Ensures child components adhere to border radius
    elevation: 3, // Added shadow for depth (Android)
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  name: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
});

export default React.memo(UserItem); // Using React.memo for performance optimization
