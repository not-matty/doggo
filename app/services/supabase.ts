// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { v5 as uuidv5 } from 'uuid';

// Use expoConfig instead of deprecated manifest
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// Create the Supabase client with specific auth settings for Clerk integration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // We don't want to persist the session as Clerk handles that
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

// Helper function to decode JWT payload
const decodeJWT = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
};

// Function to generate a deterministic UUID v5 from a phone number
const generateStableUUID = (phone: string) => {
    // Use the same namespace UUID as in the database function
    const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const combinedText = `${phone}_doggo_app`;
    return uuidv5(combinedText, NAMESPACE);
};

// Function to update the Supabase auth token with Clerk JWT
export const updateSupabaseAuthToken = async (token: string | null) => {
    try {
        if (!token) {
            await supabase.auth.signOut();
            console.log('Successfully signed out from Supabase');
            return null;
        }

        // Decode the JWT to get the phone number
        const payload = decodeJWT(token);
        if (!payload?.phone) {
            throw new Error('No phone number found in JWT');
        }

        // Generate a stable UUID from the phone number
        const stableUUID = generateStableUUID(payload.phone);

        // Create a new JWT with the stable UUID as the sub claim
        const customJWT = {
            ...payload,
            sub: stableUUID
        };

        // First try to get the current session
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        // If we have a current session and it matches our token, reuse it
        if (currentSession?.access_token === token) {
            console.log('Reusing existing Supabase session');
            return currentSession;
        }

        // Otherwise, set up a new session
        await supabase.auth.signOut(); // Clear any existing session

        // Set up the session with the modified token
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
