import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@services/supabase';

// Define query keys for posts
export const POST_KEYS = {
    all: ['posts'] as const,
    user: (userId: string) => [...POST_KEYS.all, 'user', userId] as const,
    feed: () => [...POST_KEYS.all, 'feed'] as const,
    post: (postId: string) => [...POST_KEYS.all, 'post', postId] as const,
    explore: () => [...POST_KEYS.all, 'explore'] as const,
};

// Define page size for pagination
const PAGE_SIZE = 20;

// Define type for profile data from Supabase
interface ProfileData {
    id: string;
    name: string | null;
    username: string | null;
    profile_picture_url: string | null;
}

// Define Post type for better typing
export interface Photo {
    id: string;
    url: string;
    caption?: string;
    created_at: string;
    user_id: string;
    user?: {
        id: string;
        name: string;
        username: string;
        profile_picture_url?: string | null;
    };
}

// Type for page data
interface PostsPage {
    posts: Photo[];
    nextPage?: number;
}

// Helper function to transform profile data from Supabase
function transformProfile(profileData: ProfileData | ProfileData[] | null): Photo['user'] | undefined {
    if (!profileData) return undefined;

    // Handle array of profiles
    if (Array.isArray(profileData)) {
        if (profileData.length === 0) return undefined;
        const profile = profileData[0];
        return {
            id: profile.id,
            name: profile.name || 'Unknown',
            username: profile.username || 'user',
            profile_picture_url: profile.profile_picture_url
        };
    }

    // Handle single profile object
    return {
        id: profileData.id,
        name: profileData.name || 'Unknown',
        username: profileData.username || 'user',
        profile_picture_url: profileData.profile_picture_url
    };
}

/**
 * Hook to fetch a single post by ID
 */
export const usePost = (postId: string | undefined) => {
    return useQuery<Photo>({
        queryKey: postId ? POST_KEYS.post(postId) : ['posts', 'empty'],
        queryFn: async () => {
            if (!postId) throw new Error('Post ID is required');

            const { data, error } = await supabase
                .from('photos')
                .select(`
                    id,
                    url,
                    caption,
                    created_at,
                    user_id,
                    profiles:user_id (
                    id,
                    name,
                    username,
                    profile_picture_url
                    )
                `)
                .eq('id', postId)
                .single();

            if (error) throw error;

            // Transform profile data safely
            const user = transformProfile(data.profiles as ProfileData | ProfileData[]);

            // Construct photo object
            return {
                id: data.id,
                url: data.url,
                caption: data.caption || undefined,
                created_at: data.created_at,
                user_id: data.user_id,
                user
            };
        },
        enabled: !!postId,
    });
};

/**
 * Hook to fetch posts by user ID with pagination
 */
export const useUserPosts = (userId: string | undefined) => {
    return useInfiniteQuery<PostsPage>({
        queryKey: userId ? POST_KEYS.user(userId) : ['posts', 'empty'],
        queryFn: async ({ pageParam }) => {
            if (!userId) throw new Error('User ID is required');

            const offset = Number(pageParam) * PAGE_SIZE;

            const { data, error } = await supabase
                .from('photos')
                .select(`
                    id,
                    url,
                    caption,
                    created_at,
                    user_id,
                    profiles:user_id (
                    id,
                    name,
                    username,
                    profile_picture_url
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            // Transform the data to match the Photo structure
            const transformedData = data.map(post => {
                return {
                    id: post.id,
                    url: post.url,
                    caption: post.caption || undefined,
                    created_at: post.created_at,
                    user_id: post.user_id,
                    user: transformProfile(post.profiles as ProfileData | ProfileData[])
                };
            });

            return {
                posts: transformedData,
                nextPage: data.length === PAGE_SIZE ? Number(pageParam) + 1 : undefined,
            };
        },
        getNextPageParam: (lastPage: PostsPage) => lastPage.nextPage,
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2 minutes
        initialPageParam: 0,
    });
};

/**
 * Hook to fetch explore posts (recent posts from user's network)
 */
export const useExplorePosts = (currentUserId: string | undefined) => {
    return useInfiniteQuery<PostsPage>({
        queryKey: POST_KEYS.explore(),
        queryFn: async ({ pageParam }) => {
            if (!currentUserId) throw new Error('Current user ID is required');

            const offset = Number(pageParam) * PAGE_SIZE;

            try {
                // Try to use the RPC function first
                const { data, error } = await supabase.rpc('get_contact_network_posts', {
                    current_user_id: currentUserId,
                    limit_count: PAGE_SIZE,
                    offset_count: offset,
                });

                if (error) throw error;

                // Transform data to match Post structure
                const transformedData = data.map((post: any) => ({
                    id: post.id,
                    url: post.url,
                    caption: post.caption || undefined,
                    created_at: post.created_at,
                    user_id: post.user_id,
                    user: {
                        id: post.user_id,
                        name: post.name || 'Unknown',
                        username: post.username || 'user',
                        profile_picture_url: post.profile_picture_url
                    },
                }));

                return {
                    posts: transformedData,
                    nextPage: data.length === PAGE_SIZE ? Number(pageParam) + 1 : undefined,
                };
            } catch (error) {
                // Fallback to regular query if RPC fails
                console.error('RPC error, falling back to regular query:', error);

                const { data, error: fallbackError } = await supabase
                    .from('photos')
                    .select(`
            id,
            url,
            caption,
            created_at,
            user_id,
            profiles:user_id (
              id,
              name,
              username,
              profile_picture_url
            )
          `)
                    .order('created_at', { ascending: false })
                    .range(offset, offset + PAGE_SIZE - 1);

                if (fallbackError) throw fallbackError;

                // Transform the data to match the Photo structure with proper handling of profiles array
                const transformedData = data.map(post => {
                    const user = transformProfile(post.profiles as ProfileData | ProfileData[]) || {
                        id: post.user_id,
                        name: 'Unknown',
                        username: 'user',
                        profile_picture_url: null,
                    };

                    return {
                        id: post.id,
                        url: post.url,
                        caption: post.caption || undefined,
                        created_at: post.created_at,
                        user_id: post.user_id,
                        user
                    };
                });

                return {
                    posts: transformedData,
                    nextPage: data.length === PAGE_SIZE ? Number(pageParam) + 1 : undefined,
                };
            }
        },
        getNextPageParam: (lastPage: PostsPage) => lastPage.nextPage,
        enabled: !!currentUserId,
        staleTime: 60 * 1000, // 1 minute
        initialPageParam: 0,
    });
}; 