// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

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

// Function to update the Supabase auth token with Clerk JWT
export const updateSupabaseAuthToken = async (token: string | null) => {
    try {
        if (!token) {
            // If no token, sign out from Supabase
            await supabase.auth.signOut();
            console.log('Successfully signed out from Supabase');
            return null;
        }

        // Decode the JWT to get the user_id claim
        const payload = decodeJWT(token);
        if (!payload?.user_id) {
            console.error('No user_id found in JWT payload');
            return null;
        }

        // Create a session with the Clerk user ID
        const customSession = {
            access_token: token,
            refresh_token: token,
            user: {
                id: payload.user_id, // Use Clerk user ID consistently
                aud: 'authenticated',
                role: 'authenticated',
                email: payload.email || null,
            }
        };

        // Set custom session with the token
        const { data: { session }, error: authError } = await supabase.auth.setSession(customSession);

        if (authError) {
            if (authError.message.includes('sub claim must be a UUID')) {
                // This is expected - the RLS policies will still work with clerk_id
                console.log('Using Clerk ID for session - RLS will use clerk_id column');
            } else {
                console.error('Error setting Supabase session:', authError);
                return null;
            }
        }

        if (session) {
            console.log('Successfully set Supabase session with Clerk ID');
            return session;
        }

        return null;
    } catch (error) {
        console.error('Error in updateSupabaseAuthToken:', error);
        return null;
    }
};
