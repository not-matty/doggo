import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { User } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';
import Feather from 'react-native-vector-icons/Feather';

interface ProfileHeaderProps {
    profile: User;
    isOwnProfile?: boolean;
    onEditPress?: () => void;
    onSignOutPress?: () => void;
    onLikePress?: () => void;
    isLiked?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
    profile,
    isOwnProfile = false,
    onEditPress,
    onSignOutPress,
    onLikePress,
    isLiked = false,
}) => {
    return (
        <View style={styles.container}>
            <Image
                source={
                    profile.profile_picture_url
                        ? { uri: profile.profile_picture_url }
                        : require('@assets/images/Default_pfp.svg.png')
                }
                style={styles.profileImage}
            />
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            <View style={styles.buttonContainer}>
                {isOwnProfile ? (
                    <>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={onEditPress}
                        >
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={onSignOutPress}
                        >
                            <Feather name="log-out" size={20} color={colors.error} />
                            <Text style={styles.signOutButtonText}>Sign Out</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={[styles.likeButton, isLiked && styles.likedButton]}
                        onPress={onLikePress}
                    >
                        <Feather
                            name={isLiked ? 'heart' : 'heart'}
                            size={20}
                            color={isLiked ? colors.background : colors.primary}
                        />
                        <Text style={[styles.likeButtonText, isLiked && styles.likedButtonText]}>
                            {isLiked ? 'Liked' : 'Like'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: spacing.md,
    },
    name: {
        fontSize: typography.header.fontSize,
        fontWeight: typography.header.fontWeight,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    username: {
        fontSize: typography.body.fontSize,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    bio: {
        fontSize: typography.body.fontSize,
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    editButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: layout.borderRadius.md,
    },
    editButtonText: {
        color: colors.background,
        fontSize: typography.body.fontSize,
        fontWeight: '600',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: layout.borderRadius.md,
        borderWidth: 1,
        borderColor: colors.error,
    },
    signOutButtonText: {
        color: colors.error,
        fontSize: typography.body.fontSize,
        fontWeight: '600',
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: layout.borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.background,
    },
    likedButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    likeButtonText: {
        color: colors.primary,
        fontSize: typography.body.fontSize,
        fontWeight: '600',
    },
    likedButtonText: {
        color: colors.background,
    },
});

export default ProfileHeader; 