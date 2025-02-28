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
export const updateSupabaseAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (!token) {
      // Handle logout
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('clerk_user_id');
      await AsyncStorage.removeItem('supabase_uuid');
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
    
    console.log('Clerk ID:', clerkUserId);
    console.log('Converting to UUID:', supabaseUuid);

    // Skip trying to set an auth session with Supabase
    // Instead, we'll work in anonymous mode and use clerkIdToUuid for DB operations
    
    // Create or ensure profile exists
    await ensureProfileExists(clerkUserId, supabaseUuid);
    
  } catch (error) {
    console.error('Error updating Supabase auth token:', error);
    throw error;
  }
};

// Helper function to ensure profile exists
async function ensureProfileExists(clerkId: string, uuid: string) {
  try {
    // First check if profile exists with this UUID as clerk_id
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', uuid)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    if (!data) {
      console.log('No profile found, will be created during registration');
    } else {
      console.log('Profile exists:', data.id);
    }
  } catch (error) {
    console.warn('Error checking profile exists:', error);
  }
}

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