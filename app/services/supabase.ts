// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import { v5 as uuidv5 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use expoConfig instead of deprecated manifest
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// Create the Supabase client with minimal configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});

// Consistent namespace for UUID v5 generation
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard UUID namespace

// Convert Clerk ID to UUID format
export const clerkIdToUuid = (clerkId: string): string => {
    try {
        return uuidv5(clerkId, UUID_NAMESPACE);
    } catch (error) {
        console.error('Error converting Clerk ID to UUID:', error);
        throw error;
    }
};

// Function to update the Supabase auth token
export const updateSupabaseAuthToken = async (token: string | null): Promise<void> => {
    try {
        if (!token) {
            // Handle logout
            await supabase.auth.signOut();
            return;
        }

        // Decode the JWT to get the payload
        const decoded: any = jwtDecode(token);

        // Get the Clerk user ID
        const clerkUserId = decoded.sub || decoded.user_id;

        if (!clerkUserId) {
            throw new Error('No user ID found in token');
        }

        // Store this mapping for future use
        await AsyncStorage.setItem('clerk_user_id', clerkUserId);
        
        // Convert to UUID format for Supabase
        const supabaseUUID = clerkIdToUuid(clerkUserId);
        
        // Store the UUID mapping for direct database operations
        await AsyncStorage.setItem('supabase_uuid', supabaseUUID);

        console.log('Clerk ID:', clerkUserId);
        console.log('Converted to Supabase UUID:', supabaseUUID);

        // The most reliable way to set up auth with Supabase is to directly use 
        // their signIn method with the custom token from Clerk
        const { error } = await supabase.auth.signInWithJwt({
            token,
        });

        if (error) {
            console.error('Error signing in with JWT:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating Supabase auth token:', error);
        throw error;
    }
};

// Helper to get the current user's UUID for Supabase operations
export const getCurrentUserUuid = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem('supabase_uuid');
    } catch (error) {
        console.error('Error getting current user UUID:', error);
        return null;
    }
};