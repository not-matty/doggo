// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Use expoConfig instead of deprecated manifest
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// Create the Supabase client with specific auth settings for Clerk integration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: {
            getItem: () => null,
            setItem: () => { },
            removeItem: () => { },
        },
    },
});

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

        console.log('JWT Parts:');
        console.log('Header:', JSON.parse(decodeBase64Url(headerB64) || '{}'));
        console.log('Payload:', JSON.parse(decodeBase64Url(payloadB64) || '{}'));
        console.log('Signature (base64url):', signatureB64);

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

// Function to update the Supabase auth token with Clerk JWT
export const updateSupabaseAuthToken = async (token: string | null) => {
    try {
        if (!token) {
            await supabase.auth.signOut();
            console.log('Successfully signed out from Supabase');
            return null;
        }

        // Set up the session with the token
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: token // Use same token since we don't need refresh
        });

        if (sessionError) {
            console.error('Error setting session:', sessionError);
            return null;
        }

        console.log('Successfully set Supabase session');
        return session;
    } catch (error) {
        console.error('Error in updateSupabaseAuthToken:', error);
        return null;
    }
};
