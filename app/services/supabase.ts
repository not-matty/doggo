// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

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
export const updateSupabaseAuthToken = async (token: string | null) => {
    if (!token) {
        await supabase.auth.signOut();
        return null;
    }

    try {
        const { data: { session }, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: token,
        });

        if (error) {
            console.error('Error setting Supabase session:', error);
            throw error;
        }

        // Log the JWT claims for debugging
        const jwt = decodeJWT(token);
        console.log('JWT claims:', jwt?.payload);

        return session;
    } catch (error) {
        console.error('Error updating Supabase session:', error);
        return null;
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
