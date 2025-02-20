import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Text,
    Image,
    TouchableOpacity,
} from 'react-native';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import EmptyState from '@components/common/EmptyState';
import { User } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography } from '@styles/theme';

interface Match extends User {
    matched_at: string;
}

const LikesScreen: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const navigation = useNavigation();

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            if (!user?.id) return;

            // Get matches for the current user
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select(`
                    id,
                    matched_at,
                    user1:user1_id (
                        id,
                        name,
                        username,
                        profile_picture_url,
                        created_at,
                        updated_at
                    ),
                    user2:user2_id (
                        id,
                        name,
                        username,
                        profile_picture_url,
                        created_at,
                        updated_at
                    )
                `)
                .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

            if (matchesError) throw matchesError;

            // Transform the data to match our Match type
            const transformedMatches = (matchesData || []).map(match => {
                const matchedUser = match.user1.id === user.id ? match.user2 : match.user1;
                return {
                    ...matchedUser,
                    matched_at: match.matched_at
                };
            });

            setMatches(transformedMatches);
        } catch (error: any) {
            console.error('Error fetching matches:', error);
            Alert.alert('Error', error.message || 'Failed to fetch matches');
        } finally {
            setLoading(false);
        }
    };

    const navigateToProfile = (userId: string) => {
        // If it's the current user's profile, navigate directly to the Profile tab
        if (user?.id === userId) {
            // @ts-ignore - Navigating to root tab
            navigation.navigate('Profile');
        } else {
            // If it's another user's profile, navigate to their ProfileDetails
            navigation.navigate('ProfileDetails' as never, { userId } as never);
        }
    };

    const renderMatch = ({ item }: { item: Match }) => (
        <TouchableOpacity
            style={styles.matchContainer}
            onPress={() => navigateToProfile(item.id)}
        >
            <Image
                source={{ uri: item.profile_picture_url || 'https://via.placeholder.com/60' }}
                style={styles.profileImage}
            />
            <View style={styles.matchInfo}>
                <Text style={styles.nameText}>{item.name}</Text>
                <Text style={styles.usernameText}>@{item.username}</Text>
                <Text style={styles.matchedText}>
                    Matched {new Date(item.matched_at).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={matches}
                keyExtractor={(item) => item.id}
                renderItem={renderMatch}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                ListEmptyComponent={
                    <EmptyState
                        message="No matches yet"
                        subMessage="When you and someone else like each other, you'll see them here"
                    />
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    contentContainer: {
        padding: spacing.md,
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: spacing.md,
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: spacing.md,
    },
    matchInfo: {
        flex: 1,
    },
    nameText: {
        fontSize: typography.title.fontSize,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    usernameText: {
        fontSize: typography.body.fontSize,
        color: colors.textSecondary,
        marginTop: 2,
    },
    matchedText: {
        fontSize: typography.caption.fontSize,
        color: colors.textSecondary,
        marginTop: 4,
    },
});

export default LikesScreen; 