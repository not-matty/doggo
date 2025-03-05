import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@services/supabase';

// Define query keys as constants to ensure consistency
export const PROFILE_KEYS = {
    all: ['profiles'] as const,
    profile: (id: string) => [...PROFILE_KEYS.all, id] as const,
};

// Define type for Profile
export interface Profile {
    id: string;
    name: string;
    username: string;
    profile_picture_url?: string;
    bio?: string;
    clerk_id?: string;
    phone?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Custom hook to fetch a user profile
 * Uses React Query for automatic caching and refetching
 */
export const useProfile = (userId: string | undefined) => {
    return useQuery<Profile>({
        queryKey: userId ? PROFILE_KEYS.profile(userId) : ['profiles', 'empty'],
        queryFn: async () => {
            if (!userId) throw new Error('User ID is required');

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data as Profile;
        },
        enabled: !!userId,
    });
};

/**
 * Hook for updating a user profile
 */
export const useUpdateProfile = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch the profile query
            queryClient.invalidateQueries({ queryKey: PROFILE_KEYS.profile(variables.id) });
            return data;
        },
    });
}; 