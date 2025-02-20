// UserItem.tsx

import React, { useContext } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SearchStackParamList, User } from '@navigation/types';
import { colors, spacing, typography, shadows } from '@styles/theme';
import { AuthContext } from '@context/AuthContext';

type UserItemProps = {
  profile: User;
};

const { width } = Dimensions.get('window');

type NavigationType = NavigationProp<SearchStackParamList, 'SearchPage'>;

const UserItem: React.FC<UserItemProps> = ({ profile }) => {
  const navigation = useNavigation<NavigationType>();
  const { user: authUser } = useContext(AuthContext);

  const navigateToProfile = () => {
    // If it's the current user's profile, navigate directly to the Profile tab
    if (authUser?.id === profile.id) {
      // @ts-ignore - Navigating to root tab
      navigation.navigate('Profile');
    } else {
      // If it's another user's profile, navigate to their ProfileDetails
      navigation.navigate('ProfileDetails', { userId: profile.id });
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={navigateToProfile}
      activeOpacity={0.8}
      accessibilityLabel={`View profile of ${profile.name}`}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={
            profile.profile_picture_url
              ? { uri: profile.profile_picture_url }
              : require('@assets/images/Default_pfp.svg.png')
          }
          style={styles.avatar}
          resizeMode="cover"
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
        <Text style={styles.username} numberOfLines={1}>@{profile.username}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: Platform.select({
      ios: 1,
      android: 0,
    }),
    borderBottomColor: colors.divider,
    ...Platform.select({
      android: {
        elevation: 1,
        marginVertical: 1,
      },
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  avatarContainer: {
    ...Platform.select({
      android: {
        elevation: 2,
        backgroundColor: colors.background,
        borderRadius: 25,
      },
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
  },
  infoContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  username: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default React.memo(UserItem);
