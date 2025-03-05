import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

// Define query keys for likes
export const LIKE_KEYS = {
    all: ['likes'] as const,
    user: (userId: string) => [...LIKE_KEYS.all, 'user', userId] as const,
    post: (postId: string) => [...LIKE_KEYS.all, 'post', postId] as const,
    userLikes: (userId: string) => [...LIKE_KEYS.all, 'userLikes', userId] as const,
    status: (userId: string, targetId: string) => [...LIKE_KEYS.all, 'status', userId, targetId] as const,
    unregisteredStatus: (userId: string, phone: string) => [...LIKE_KEYS.all, 'unregisteredStatus', userId, phone] as const,
};

// Types for the like responses
type LikeStatus = 'liked' | null;

interface UnregisteredContact {
    id: string;
    name: string | null;
    phone: string;
}

interface ProfileLike {
    id: string;
    targetId: string;
    isRegistered: boolean;
    profile: {
        id: string;
        name: string | null;
        username: string | null;
        profile_picture_url: string | null;
        phone?: string;
    };
}

/**
 * Hook to check if a user has liked a profile
 * @param userId - The ID of the current user
 * @param targetId - The ID of the target user
 */
export const useLikeStatus = (userId: string | undefined, targetId: string | undefined) => {
    return useQuery<LikeStatus, Error>({
        queryKey: userId && targetId ? LIKE_KEYS.status(userId, targetId) : ['likes', 'status', 'disabled'],
        queryFn: async () => {
            if (!userId || !targetId) throw new Error('User ID and target ID are required');

            // Check valid UUIDs before querying
            const isValidUuid = (id: string) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            if (!isValidUuid(userId) || !isValidUuid(targetId)) {
                console.log('Invalid UUID format for userId or targetId');
                return null;
            }

            // Check if this is a registered user like
            const { data, error } = await supabase
                .from('likes')
                .select('id')
                .eq('liker_id', userId)
                .eq('liked_id', targetId)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 means no rows returned, which is fine (user hasn't liked the profile)
                throw error;
            }

            return data ? 'liked' : null;
        },
        enabled: !!userId && !!targetId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

/**
 * Hook to check if a user has liked an unregistered contact
 * @param userId - The ID of the current user
 * @param phone - The phone number of the unregistered contact
 */
export const useUnregisteredLikeStatus = (
    userId: string | undefined,
    phone: string | undefined
) => {
    return useQuery<LikeStatus, Error>({
        queryKey: userId && phone ? LIKE_KEYS.unregisteredStatus(userId, phone) : ['likes', 'unregisteredStatus', 'disabled'],
        queryFn: async () => {
            if (!userId || !phone) throw new Error('User ID and phone are required');

            // First get the user's phone number
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!userData?.phone) return null; // User doesn't have a phone number

            // Check for unregistered like
            const { data, error } = await supabase
                .from('unregistered_likes')
                .select('id')
                .eq('liker_phone', userData.phone)
                .eq('liked_phone', phone)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data ? 'liked' : null;
        },
        enabled: !!userId && !!phone,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

interface LikeToggleResult {
    liked: boolean;
    isMatch: boolean;
}

interface UnregisteredLikeToggleResult {
    liked: boolean;
}

/**
 * Hook to toggle like status for registered users
 */
export const useToggleLike = () => {
    const queryClient = useQueryClient();

    return useMutation<
        LikeToggleResult,
        Error,
        { likerId: string; likedId: string },
        { previousStatus: LikeStatus | undefined }
    >({
        mutationFn: async ({ likerId, likedId }) => {
            if (!likerId || !likedId) {
                throw new Error('Liker ID and liked ID are required');
            }

            // Check valid UUIDs before querying
            const isValidUuid = (id: string) =>
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

            if (!isValidUuid(likerId) || !isValidUuid(likedId)) {
                throw new Error('Invalid UUID format for likerId or likedId');
            }

            // Check if like already exists
            const { data: existingLike, error: checkError } = await supabase
                .from('likes')
                .select('id')
                .eq('liker_id', likerId)
                .eq('liked_id', likedId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingLike) {
                // Unlike - remove the like
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .eq('id', existingLike.id);

                if (error) throw error;

                return { liked: false, isMatch: false };
            } else {
                // Like - create a new like
                const { error } = await supabase
                    .from('likes')
                    .insert({ liker_id: likerId, liked_id: likedId });

                if (error) throw error;

                // Check if it's a mutual like (match)
                const { data: mutualLike, error: mutualError } = await supabase
                    .from('likes')
                    .select('id')
                    .eq('liker_id', likedId)
                    .eq('liked_id', likerId)
                    .single();

                if (mutualError && mutualError.code !== 'PGRST116') {
                    throw mutualError;
                }

                // If mutual like exists, create a match
                if (mutualLike) {
                    const { error: matchError } = await supabase
                        .from('matches')
                        .insert({ user1_id: likerId, user2_id: likedId });

                    if (matchError) throw matchError;

                    // Create notifications for both users
                    await supabase
                        .from('notifications')
                        .insert([
                            {
                                user_id: likerId,
                                type: 'match',
                                data: { matched_user_id: likedId }
                            },
                            {
                                user_id: likedId,
                                type: 'match',
                                data: { matched_user_id: likerId }
                            }
                        ]);

                    return { liked: true, isMatch: true };
                }

                // Create a like notification for the liked user
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: likedId,
                        type: 'like',
                        data: { liker_id: likerId }
                    });

                return { liked: true, isMatch: false };
            }
        },

        onMutate: async ({ likerId, likedId }) => {
            // Cancel any outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({
                queryKey: LIKE_KEYS.status(likerId, likedId)
            });

            // Save the previous status
            const previousStatus = queryClient.getQueryData<LikeStatus>(
                LIKE_KEYS.status(likerId, likedId)
            );

            // Optimistically update to the new value
            queryClient.setQueryData(
                LIKE_KEYS.status(likerId, likedId),
                previousStatus === 'liked' ? null : 'liked'
            );

            return { previousStatus };
        },

        onError: (err, { likerId, likedId }, context) => {
            if (context) {
                queryClient.setQueryData(
                    LIKE_KEYS.status(likerId, likedId),
                    context.previousStatus
                );
            }
        },

        onSettled: (_, __, { likerId, likedId }) => {
            queryClient.invalidateQueries({
                queryKey: LIKE_KEYS.status(likerId, likedId)
            });
            queryClient.invalidateQueries({
                queryKey: LIKE_KEYS.userLikes(likerId)
            });
        },
    });
};

/**
 * Hook to toggle like status for unregistered contacts
 */
export const useToggleUnregisteredLike = () => {
    const queryClient = useQueryClient();

    return useMutation<
        UnregisteredLikeToggleResult,
        Error,
        { userId: string; phone: string },
        { previousStatus: LikeStatus | undefined }
    >({
        mutationFn: async ({ userId, phone }) => {
            if (!userId || !phone) {
                throw new Error('User ID and phone are required');
            }

            // First get the user's phone number
            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('phone, name')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!userData?.phone) throw new Error('User does not have a phone number');

            // Check if like already exists
            const { data: existingLike, error: checkError } = await supabase
                .from('unregistered_likes')
                .select('id')
                .eq('liker_phone', userData.phone)
                .eq('liked_phone', phone)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingLike) {
                // Unlike - remove the unregistered like
                const { error } = await supabase
                    .from('unregistered_likes')
                    .delete()
                    .eq('id', existingLike.id);

                if (error) throw error;

                return { liked: false };
            } else {
                // Like - create a new unregistered like
                const { error } = await supabase
                    .from('unregistered_likes')
                    .insert({
                        liker_phone: userData.phone,
                        liked_phone: phone
                    });

                if (error) throw error;

                // Try to send an SMS invitation (this would call a Supabase Edge Function)
                try {
                    const { data: response, error: smsError } = await supabase.functions.invoke('send-invite', {
                        body: {
                            phone,
                            fromUserName: userData.name || 'Someone'
                        }
                    });

                    if (smsError) console.error('Error sending invitation SMS:', smsError);
                } catch (err) {
                    console.error('Failed to send invitation:', err);
                    // Continue even if SMS fails - the like is still recorded
                }

                return { liked: true };
            }
        },

        onMutate: async ({ userId, phone }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({
                queryKey: LIKE_KEYS.unregisteredStatus(userId, phone)
            });

            // Save the previous status
            const previousStatus = queryClient.getQueryData<LikeStatus>(
                LIKE_KEYS.unregisteredStatus(userId, phone)
            );

            // Optimistically update to the new value
            queryClient.setQueryData(
                LIKE_KEYS.unregisteredStatus(userId, phone),
                previousStatus === 'liked' ? null : 'liked'
            );

            return { previousStatus };
        },

        onError: (err, { userId, phone }, context) => {
            if (context) {
                queryClient.setQueryData(
                    LIKE_KEYS.unregisteredStatus(userId, phone),
                    context.previousStatus
                );
            }
        },

        onSettled: (_, __, { userId, phone }) => {
            queryClient.invalidateQueries({
                queryKey: LIKE_KEYS.unregisteredStatus(userId, phone)
            });
        },
    });
};

/**
 * Hook to fetch a user's likes with detailed profile information
 */
export const useUserLikes = (userId: string | undefined) => {
    return useQuery<ProfileLike[], Error>({
        queryKey: userId ? LIKE_KEYS.userLikes(userId) : ['likes', 'userLikes', 'disabled'],
        queryFn: async () => {
            if (!userId) throw new Error('User ID is required');

            // Get registered likes
            const { data: registeredLikes, error: registeredError } = await supabase
                .from('likes')
                .select(`
                    id, 
                    liked_id,
                    profiles:liked_id (
                        id, 
                        name, 
                        username, 
                        profile_picture_url,
                        phone
                    )
                `)
                .eq('liker_id', userId);

            if (registeredError) throw registeredError;

            // Get unregistered likes
            const { data: unregisteredLikes, error: unregisteredError } = await supabase
                .from('unregistered_likes')
                .select(`
                    id, 
                    liked_phone,
                    unregistered_contacts:liked_phone (
                        id,
                        name,
                        phone
                    )
                `)
                .eq('liker_phone', userId);

            if (unregisteredError) throw unregisteredError;

            // Format registered likes into consistent objects
            const formattedRegisteredLikes = registeredLikes.map((like) => {
                // Make sure to handle the case where profile might be an array
                const profileData = Array.isArray(like.profiles) ? like.profiles[0] : like.profiles;

                return {
                    id: like.id,
                    targetId: like.liked_id,
                    isRegistered: true,
                    profile: {
                        id: profileData?.id || '',
                        name: profileData?.name || 'Unknown',
                        username: profileData?.username || null,
                        profile_picture_url: profileData?.profile_picture_url || null,
                        phone: profileData?.phone
                    },
                };
            });

            // Format unregistered likes into consistent objects
            const formattedUnregisteredLikes = unregisteredLikes.map((like) => {
                // Make sure to handle the case where contact might be an array
                const contactData = Array.isArray(like.unregistered_contacts)
                    ? like.unregistered_contacts[0]
                    : like.unregistered_contacts;

                return {
                    id: like.id,
                    targetId: contactData?.id || '',
                    isRegistered: false,
                    profile: {
                        id: contactData?.id || '',
                        name: contactData?.name || 'Unknown',
                        username: null,
                        profile_picture_url: null,
                        phone: like.liked_phone
                    },
                };
            });

            // Combine both types of likes
            return [...formattedRegisteredLikes, ...formattedUnregisteredLikes];
        },
        enabled: !!userId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}; 