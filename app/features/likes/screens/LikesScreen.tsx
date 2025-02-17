import React, { useEffect, useState, useContext } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    SafeAreaView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { supabase } from '@services/supabase';
import { AuthContext } from '@context/AuthContext';
import PhotoCarousel from '@components/common/PhotoCarousel';
import EmptyState from '@components/common/EmptyState';

interface LikedPost {
    id: string;
    photo_url: string;
    user_id: string;
    created_at: string;
    caption?: string;
}

const LikesScreen: React.FC = () => {
    const [likedPosts, setLikedPosts] = useState<LikedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchLikedPosts();
    }, []);

    const fetchLikedPosts = async () => {
        try {
            if (!user?.id) return;

            const { data, error } = await supabase
                .from('likes')
                .select(`
          post_id,
          posts (
            id,
            photo_url,
            user_id,
            created_at,
            caption
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedPosts = data
                .map(item => item.posts)
                .filter(post => post !== null) as LikedPost[];

            setLikedPosts(formattedPosts);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch liked posts');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={likedPosts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <PhotoCarousel
                        photos={[{ uri: item.photo_url }]}
                        caption={item.caption}
                        userId={item.user_id}
                    />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
                ListEmptyComponent={
                    <EmptyState
                        message="No liked posts yet"
                        subMessage="Posts you like will appear here"
                    />
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingBottom: 20,
    },
});

export default LikesScreen; 