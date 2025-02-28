// app/services/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { v5 as uuidv5 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use expoConfig instead of deprecated manifest
const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || '';

// UUID namespace
const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Function to convert Clerk ID to UUID
export const clerkIdToUuid = (clerkId: string): string => {
  return uuidv5(clerkId, UUID_NAMESPACE);
};

// Function to handle auth with Supabase
export const updateSupabaseAuthToken = async (token: string | null, skipProfileCheck: boolean = false): Promise<void> => {
  try {
    if (!token) {
      // Handle logout
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('clerk_user_id');
      await AsyncStorage.removeItem('supabase_uuid');
      await AsyncStorage.removeItem('profile_id');
      return;
    }

    // Parse the token to get Clerk ID
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) throw new Error('Invalid JWT format');

    const payload = JSON.parse(atob(tokenParts[1]));
    const clerkUserId = payload.sub;

    if (!clerkUserId) throw new Error('No user ID found in token');

    // Store the Clerk user ID
    await AsyncStorage.setItem('clerk_user_id', clerkUserId);

    // Convert to UUID format for Supabase
    const supabaseUuid = clerkIdToUuid(clerkUserId);

    // Store the UUID mapping
    await AsyncStorage.setItem('supabase_uuid', supabaseUuid);

    // Only log if not skipping profile check
    if (!skipProfileCheck) {
      console.log('Clerk ID:', clerkUserId);
      console.log('Converting to UUID:', supabaseUuid);

      // Find or ensure profile exists only if not skipping
      await ensureProfileExists(clerkUserId, supabaseUuid);
    }

  } catch (error) {
    console.error('Error updating Supabase auth token:', error);
    throw error;
  }
};

// Helper function to ensure profile exists
async function ensureProfileExists(clerkId: string, uuid: string) {
  try {
    // First check if we already have a profile ID cached
    const profileId = await AsyncStorage.getItem('profile_id');
    if (profileId) {
      console.log('Profile exists (from cache):', profileId);
      return profileId;
    }

    // Check if we've recently processed this ID (within last 5 minutes)
    const lastCheckStr = await AsyncStorage.getItem('last_profile_check');
    if (lastCheckStr) {
      try {
        const lastCheck = JSON.parse(lastCheckStr);
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        if (lastCheck.userId === clerkId && lastCheck.timestamp > fiveMinutesAgo) {
          console.log('Skip redundant profile existence check:', clerkId);
          return null;
        }
      } catch (e) {
        // If parsing fails, proceed with check
      }
    }

    // First check if profile exists with this UUID as clerk_id
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, username, phone')
      .eq('clerk_id', uuid)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      console.log('No profile found with clerk_id:', uuid);
      // We'll let the registration process create the profile
      return null;
    } else {
      console.log('Profile exists:', data.id);
      // Store profile ID for use throughout the app
      await AsyncStorage.setItem('profile_id', data.id);

      // Mark as processed recently
      await AsyncStorage.setItem('last_profile_check', JSON.stringify({
        userId: clerkId,
        timestamp: Date.now()
      }));

      return data.id;
    }
  } catch (error) {
    console.warn('Error checking profile exists:', error);
    return null;
  }
}

// New helper function to fetch profile using clerk_id
export const fetchProfileByClerkId = async (clerkId: string) => {
  try {
    // Convert Clerk ID to UUID
    const clerkUuid = clerkIdToUuid(clerkId);

    // Fetch profile from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', clerkUuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('No profile found for clerk_id:', clerkId);
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile by clerk_id:', error);
    throw error;
  }
};

// Get current user's profile ID (not clerk UUID)
export const getCurrentProfileId = async (): Promise<string | null> => {
  try {
    // First check if we have the profile_id stored
    const profileId = await AsyncStorage.getItem('profile_id');
    if (profileId) return profileId;

    // If not, try to get it using clerk_id
    const clerkId = await AsyncStorage.getItem('clerk_user_id');
    if (!clerkId) return null;

    // Convert and find the profile
    const clerkUuid = clerkIdToUuid(clerkId);
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', clerkUuid)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile ID:', error);
      }
      return null;
    }

    // Store it for future use
    if (data && data.id) {
      await AsyncStorage.setItem('profile_id', data.id);
    }

    return data?.id || null;
  } catch (error) {
    console.error('Error getting current profile ID:', error);
    return null;
  }
};

// Helper function for base64 URL decode
function atob(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) base64 += '=';

  // Use built-in atob if available
  if (typeof global.atob === 'function') {
    return global.atob(base64);
  }

  // Fallback implementation
  return Buffer.from(base64, 'base64').toString('binary');
}

// Get current user's UUID
export const getCurrentUserUuid = async (): Promise<string | null> => {
  try {
    // First check AsyncStorage
    const uuid = await AsyncStorage.getItem('supabase_uuid');
    if (uuid) return uuid;

    // If not found, try to convert from clerk_id
    const clerkId = await AsyncStorage.getItem('clerk_user_id');
    if (!clerkId) return null;

    const supabaseUuid = clerkIdToUuid(clerkId);
    await AsyncStorage.setItem('supabase_uuid', supabaseUuid);
    return supabaseUuid;
  } catch (error) {
    console.error('Error getting current user UUID:', error);
    return null;
  }
};