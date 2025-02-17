import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Image, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { styles } from '../../styles/styles';

const SearchScreen = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [photoViewerVisible, setPhotoViewerVisible] = useState(false);

    const fetchPosts = async () => {
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
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Ensure we have valid URLs for all posts
            const postsWithValidUrls = (data || []).map(post => ({
                ...post,
                url: post.url || '',
            }));

            setPosts(postsWithValidUrls as Post[]);
        } catch (err) {
            console.error('Error fetching posts:', err);
            Alert.alert('Error', 'Failed to fetch posts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPosts();
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
        </TouchableOpacity>
    );

    return (
    // ... rest of the component ...
  );
};

export default SearchScreen; 