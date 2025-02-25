// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import { v5 as uuidv5 } from 'uuid';

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
        const clerkUserId = decoded.user_id || decoded.sub;

        if (!clerkUserId) {
            throw new Error('No user ID found in token');
        }

        // Generate a deterministic UUID from the Clerk user ID
        // This ensures the same Clerk user always maps to the same Supabase UUID
        const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID namespace
        const supabaseUUID = uuidv5(clerkUserId, namespace);

        // Remove any existing user_id claims that Supabase won't recognize
        delete decoded.user_id;

        // Add the proper sub claim with UUID format
        decoded.sub = supabaseUUID;

        // Use Supabase's setSession which accepts a custom JWT
        const { error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: '', // You might need to handle refresh tokens separately
        });

        if (error) {
            console.error('Error updating Supabase session:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating Supabase auth token:', error);
        throw error;
    }
};

// Helper function to decode base64 URL-safe string
const decodeBase64Url = (str: string) => {
    try {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = atob(base64);
        return decoded;
    } catch (error) {
        console.error('Error decoding base64:', error);
        return null;
    }
};

// Helper function to decode JWT parts
const decodeJWT = (token: string) => {
    try {
        const [headerB64, payloadB64, signatureB64] = token.split('.');
        return {
            header: JSON.parse(decodeBase64Url(headerB64) || '{}'),
            payload: JSON.parse(decodeBase64Url(payloadB64) || '{}'),
            signature: signatureB64
        };
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
};
