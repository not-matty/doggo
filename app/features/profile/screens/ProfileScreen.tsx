import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSupabase } from '../../lib/supabase';
import { Post } from '../../types/Post';
import { colors, spacing, typography } from '../../styles/theme';

const ProfileScreen = () => {
    const supabase = useSupabase();
    const [userId, setUserId] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

    const fetchUserPosts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('photos')
                .select(`
          id,
          url,
          caption,
          created_at,
          user_id,
          user:profiles (*)
        `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Ensure we have valid URLs for all posts
            const postsWithValidUrls = (data || []).map(post => ({
                ...post,
                url: post.url || '',
            }));

            setPosts(postsWithValidUrls as Post[]);
        } catch (err) {
            console.error('Error fetching user posts:', err);
            Alert.alert('Error', 'Failed to fetch posts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchUserPosts();
        }
    }, [userId]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchUserPosts();
    };

    const renderPost = ({ item }: { item: Post }) => (
        <TouchableOpacity
            style={styles.postContainer}
            activeOpacity={0.7}
            onPress={() => {
                setSelectedPost(item);
                setPhotoViewerVisible(true);
            }}
        >
            <Image
                source={{
                    uri: item.url,
                    cache: 'reload'
                }}
                style={styles.postImage}
                resizeMode="cover"
            />
            {item.caption && (
                <View style={styles.captionContainer}>
                    <Text style={styles.caption}>{item.caption}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
    // ... rest of the component ...
  );
};

const styles = StyleSheet.create({
    // ... existing styles ...
    captionContainer: {
        padding: spacing.md,
        backgroundColor: colors.background,
    },
    caption: {
        fontSize: typography.body.fontSize,
        color: colors.textPrimary,
    },
});

export default ProfileScreen; 