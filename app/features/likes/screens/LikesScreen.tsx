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
import { supabase, clerkIdToUuid } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import EmptyState from '@components/common/EmptyState';
import { User } from '@navigation/types';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, typography } from '@styles/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MainStackParamList } from '@navigation/types';

interface Match {
    id: string;
    matched_at: string;
    user: {
        id: string;
        name: string;
        username: string;
        profile_picture_url?: string | null;
    };
}

type MatchWithProfiles = {
    id: string;
    matched_at: string;
    user1: {
        id: string;
        name: string;
        username: string;
        profile_picture_url: string | null;
        clerk_id: string;
    };
    user2: {
        id: string;
        name: string;
        username: string;
        profile_picture_url: string | null;
        clerk_id: string;
    };
}

const LikesScreen: React.FC = () => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useContext(AuthContext);
    const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

    useEffect(() => {
        // Only do initial fetch on first mount
        const initialFetch = async () => {
            // Check if we're already authenticated before fetching
            const profileId = await AsyncStorage.getItem('profile_id');
            if (profileId) {
                fetchMatches();
            } else {
                // Just exit loading state if not authenticated
                setLoading(false);
            }
        };

        initialFetch();

        // Add a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            if (loading) {
                console.log('Likes screen timeout - forcing exit from loading state');
                setLoading(false);
            }
        }, 8000);

        return () => clearTimeout(timeout);
    }, []);

    const fetchMatches = async () => {
        if (loading && !refreshing) return; // Prevent multiple simultaneous calls

        try {
            setLoading(true);

            // Ensure we have a valid user ID
            if (!user?.id) {
                console.error('fetchMatches: User ID is missing');
                setLoading(false);
                return;
            }

            // Validate UUID format
            const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
            if (!isValidUuid) {
                console.error(`Invalid UUID format for user ID: ${user.id}`);
                setLoading(false);
                return;
            }

            // First, fetch all likes where the current user is the liker
            const { data: sentLikes, error: sentLikesError } = await supabase
                .from('likes')
                .select('liked_id')
                .eq('liker_id', user.id);

            if (sentLikesError) {
                console.error('Error fetching sent likes:', sentLikesError);
                throw new Error('Failed to fetch sent likes');
            }

            // Then, fetch all likes where the current user is the liked
            const { data: receivedLikes, error: receivedLikesError } = await supabase
                .from('likes')
                .select('liker_id')
                .eq('liked_id', user.id);

            if (receivedLikesError) {
                console.error('Error fetching received likes:', receivedLikesError);
                throw new Error('Failed to fetch received likes');
            }

            // Find mutual likes (matches)
            const sentLikeIds = sentLikes?.map(like => like.liked_id) || [];
            const receivedLikeIds = receivedLikes?.map(like => like.liker_id) || [];

            // Filter for only valid UUIDs
            const validSentLikeIds = sentLikeIds
                .filter(id => id && typeof id === 'string')
                .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

            const validReceivedLikeIds = receivedLikeIds
                .filter(id => id && typeof id === 'string')
                .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

            // Find the intersection (mutual likes)
            const matchIds = validSentLikeIds.filter(id => validReceivedLikeIds.includes(id));

            if (matchIds.length === 0) {
                setMatches([]);
                setLoading(false);
                return;
            }

            // Fetch user details for all matches
            const { data: matchedUsers, error: matchedUsersError } = await supabase
                .from('profiles')
                .select('*')
                .in('clerk_id', matchIds);

            if (matchedUsersError) {
                console.error('Error fetching matched users:', matchedUsersError);
                throw new Error('Failed to fetch matched users');
            }

            // Format the matches
            const formattedMatches = (matchedUsers || []).map(user => {
                // Find the matching like to get the timestamp
                const like = receivedLikes?.find(like => like.liker_id === user.clerk_id);

                return {
                    id: user.clerk_id,
                    matched_at: like ? new Date().toISOString() : new Date().toISOString(),
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        profile_picture_url: user.profile_picture_url
                    }
                };
            });

            setMatches(formattedMatches);
        } catch (error) {
            console.error('Error fetching matches:', error);
            Alert.alert(
                'Error',
                'Failed to load your matches. Please try again later.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const navigateToProfile = (userId: string) => {
        if (!userId) {
            console.error('navigateToProfile: Missing user ID');
            return;
        }

        // Validate UUID format
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isValidUuid) {
            console.error(`Invalid UUID format for navigation: ${userId}`);
            return;
        }

        // If it's the current user's profile, navigate directly to the Profile tab
        if (user?.id === userId) {
            // @ts-ignore - Navigating to root tab
            navigation.navigate('Profile');
        } else {
            // If it's another user's profile, navigate to their ProfileDetails
            navigation.navigate('ProfileDetails', { userId });
        }
    };

    const renderMatch = ({ item }: { item: Match }) => (
        <TouchableOpacity
            style={styles.matchContainer}
            onPress={() => navigateToProfile(item.user.id)}
        >
            <Image
                source={{
                    uri: item.user.profile_picture_url || 'https://via.placeholder.com/60'
                }}
                style={styles.profileImage}
            />
            <View style={styles.matchInfo}>
                <Text style={styles.nameText}>{item.user.name}</Text>
                <Text style={styles.usernameText}>@{item.user.username}</Text>
                <Text style={styles.matchedText}>
                    Matched {new Date(item.matched_at).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const handleRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

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
                refreshing={refreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                    <EmptyState
                        message="No matches yet. When you and someone else like each other, you'll see them here"
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