import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    FlatList,
    Text,
    RefreshControl,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '@navigation/types';
import { useApp } from '@context/AppContext';
import { supabase } from '@services/supabase';
import { colors, spacing, typography, layout } from '@styles/theme';
import { User, Photo } from '@navigation/types';
import PhotoViewer from '@components/common/PhotoViewer';
import PhotoGrid from '@components/common/PhotoGrid';
import ProfileHeader from '@components/profile/ProfileHeader';
import debounce from 'lodash/debounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SearchScreenNavigationProp = StackNavigationProp<ProfileStackParamList>;

const SearchScreen = () => {
    const navigation = useNavigation<SearchScreenNavigationProp>();
    const { state: { profile: currentProfile } } = useApp();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [userPhotos, setUserPhotos] = useState<Record<string, Photo[]>>({});
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Add function to ensure data fetching works when the component first mounts
    useEffect(() => {
        // If we have a profile already, just store the ID but don't fetch data
        if (currentProfile?.id) {
            setCurrentUserId(currentProfile.id);
            return;
        }

        // Check if we have a profile ID in AsyncStorage
        const checkProfileStorage = async () => {
            try {
                const profileId = await AsyncStorage.getItem('profile_id');
                if (profileId) {
                    console.log('Search: Profile ID found in AsyncStorage:', profileId);
                    setCurrentUserId(profileId);
                    // No automatic data fetching here - we'll wait for user search
                }
            } catch (error) {
                console.error('Error checking profile storage:', error);
            }
        };

        checkProfileStorage();
    }, [currentProfile?.id]);

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Make sure we have a valid profile ID for any related queries
            if (!currentUserId && currentProfile?.id) {
                setCurrentUserId(currentProfile.id);
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(10);

            if (error) {
                console.error('Error searching users:', error);
                Alert.alert('Search Error', 'Failed to search users. Please try again.');
                setLoading(false);
                return;
            }

            setSearchResults(data as User[] || []);
            console.log(`Found ${data?.length || 0} users matching "${query}"`);

            // Fetch photos for each user
            if (data && data.length > 0) {
                // Use Promise.all for parallel fetching
                // Filter out any potentially invalid IDs first
                const validUserIds = data
                    .filter(user => !!user.id)
                    .filter(user => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id))
                    .map(user => user.id);

                await Promise.all(validUserIds.map(id => fetchUserPhotos(id)));
            }
        } catch (error) {
            console.error('Error searching users:', error);
            // Set empty results to avoid UI blocking
            setSearchResults([]);
        } finally {
            // Always exit loading state
            setLoading(false);
        }
    };

    const fetchUserPhotos = async (userId: string) => {
        if (!userId) {
            console.error('fetchUserPhotos: Undefined user ID detected');
            return;
        }

        // Validate UUID format to prevent database errors
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        if (!isValidUuid) {
            console.error(`Invalid UUID format for userId: ${userId}`);
            return;
        }

        try {
            // Check if we already have the photos for this user
            if (userPhotos[userId] && userPhotos[userId].length > 0) {
                return;
            }

            console.log(`Fetching photos for user ID: ${userId}`);
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) {
                console.error('Error fetching user photos:', error);
                return; // Continue execution rather than throwing
            }

            // Set photos even if empty array
            setUserPhotos(prev => ({
                ...prev,
                [userId]: data as Photo[] || [],
            }));
            console.log(`Fetched ${data?.length || 0} photos for user ${userId}`);
        } catch (error) {
            console.error('Error fetching user photos:', error);
            // Don't block the UI on photo error
        }
    };

    const debouncedSearch = useCallback(
        debounce((query: string) => searchUsers(query), 300),
        []
    );

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);

        // If text is empty, clear results and exit loading state
        if (!text.trim()) {
            setSearchResults([]);
            setLoading(false);
            return;
        }

        debouncedSearch(text);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await searchUsers(searchQuery);
        setRefreshing(false);
    };

    const handlePhotoPress = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    const renderUserItem = ({ item: user }: { item: User }) => {
        const photos = userPhotos[user.id] || [];
        const isCurrentUser = user.id === currentProfile?.id;

        return (
            <View style={styles.userCard}>
                <ProfileHeader
                    profile={user}
                    isOwnProfile={isCurrentUser}
                    onLikePress={() => navigation.navigate('ProfileDetails', { userId: user.id })}
                />
                {photos.length > 0 && (
                    <PhotoGrid
                        photos={photos}
                        onPhotoPress={handlePhotoPress}
                    />
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.searchInput}
                placeholder="Search users by name or username"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
            />

            <FlatList
                data={searchResults}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} />
                        ) : searchQuery ? (
                            <Text style={styles.emptyText}>No users found</Text>
                        ) : (
                            <Text style={styles.emptyText}>Search for users to get started</Text>
                        )}
                    </View>
                }
            />

            <PhotoViewer
                visible={!!selectedPhoto}
                photo={selectedPhoto}
                onClose={() => setSelectedPhoto(null)}
                isOwner={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchInput: {
        margin: spacing.md,
        padding: spacing.md,
        borderRadius: layout.borderRadius.md,
        backgroundColor: colors.surface,
        fontSize: typography.body.fontSize,
        color: colors.textPrimary,
    },
    listContainer: {
        padding: spacing.sm,
    },
    userCard: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius.lg,
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: spacing.xxl,
    },
    emptyText: {
        fontSize: typography.body.fontSize,
        color: colors.textSecondary,
    },
});

export default SearchScreen; 