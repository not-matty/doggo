import React, { useState, useCallback } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    FlatList,
    Text,
    RefreshControl,
    ActivityIndicator,
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

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            setSearchResults(data as User[]);

            // Fetch photos for each user
            data?.forEach(user => {
                fetchUserPhotos(user.id);
            });
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserPhotos = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) throw error;
            setUserPhotos(prev => ({
                ...prev,
                [userId]: data as Photo[],
            }));
        } catch (error) {
            console.error('Error fetching user photos:', error);
        }
    };

    const debouncedSearch = useCallback(
        debounce((query: string) => searchUsers(query), 300),
        []
    );

    const handleSearchChange = (text: string) => {
        setSearchQuery(text);
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