import React, { ReactNode, useEffect } from 'react';
import { ClerkProvider as BaseClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import { updateSupabaseAuthToken, clerkIdToUuid, supabase } from '@services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createTokenCache = (): TokenCache => ({
    getToken: (key: string) => SecureStore.getItemAsync(key),
    saveToken: (key: string, token: string) => SecureStore.setItemAsync(key, token),
});

// SecureStore is not supported on web
const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;

// Ensure publishableKey is available and valid
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
    throw new Error('Missing Clerk Publishable Key');
}

// Component to handle Supabase auth token updates
function SupabaseAuthHandler({ children }: { children: ReactNode }) {
    const { getToken, isSignedIn, userId } = useAuth();

    // We'll still use the ref as a quick first check, but add AsyncStorage as backup
    const hasProcessedRef = React.useRef<{ [key: string]: boolean }>({});

    // Use a ref instead of state to avoid re-renders
    const isProcessingRef = React.useRef<boolean>(false);

    useEffect(() => {
        let isMounted = true;

        const syncSupabaseAuth = async () => {
            try {
                // Avoid multiple simultaneous auth processing
                if (isProcessingRef.current) {
                    console.log('Already processing auth sync, skipping...');
                    return;
                }

                isProcessingRef.current = true;

                if (!isSignedIn) {
                    await updateSupabaseAuthToken(null);
                    // Clear stored IDs on sign out
                    await AsyncStorage.removeItem('clerk_user_id');
                    await AsyncStorage.removeItem('supabase_uuid');
                    await AsyncStorage.removeItem('profile_id');
                    await AsyncStorage.removeItem('last_profile_check');
                    // Reset processing cache on sign out
                    hasProcessedRef.current = {};
                    isProcessingRef.current = false;
                    return;
                }

                // Skip if no userId available
                if (!userId) {
                    isProcessingRef.current = false;
                    return;
                }

                // Check if we've recently processed this ID (within last 5 minutes)
                const lastCheckStr = await AsyncStorage.getItem('last_profile_check');
                if (lastCheckStr) {
                    try {
                        const lastCheck = JSON.parse(lastCheckStr);
                        const now = Date.now();
                        const fiveMinutesAgo = now - 5 * 60 * 1000;

                        if (lastCheck.userId === userId && lastCheck.timestamp > fiveMinutesAgo) {
                            console.log('Skip profile check - recently processed:', userId);
                            isProcessingRef.current = false;
                            return;
                        }
                    } catch (e) {
                        // If parsing fails, proceed with check
                        console.warn('Failed to parse last check timestamp');
                    }
                }

                // Also check in-memory cache
                if (hasProcessedRef.current[userId]) {
                    console.log('Skip redundant profile check (memory cache):', userId);
                    isProcessingRef.current = false;
                    return;
                }

                // Mark as processed in memory
                hasProcessedRef.current[userId] = true;

                // Store timestamp of this check to prevent near-future redundant checks
                await AsyncStorage.setItem('last_profile_check', JSON.stringify({
                    userId,
                    timestamp: Date.now()
                }));

                // Store the Clerk user ID
                await AsyncStorage.setItem('clerk_user_id', userId);

                // Also store the converted UUID for direct DB operations
                const supabaseUuid = clerkIdToUuid(userId);
                await AsyncStorage.setItem('supabase_uuid', supabaseUuid);

                console.log('Fetching profile for clerk_id:', userId);
                console.log('Converted to UUID:', supabaseUuid);

                // Check if profile exists in Supabase
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, name, username, phone')
                    .eq('clerk_id', supabaseUuid)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error fetching profile:', profileError);
                }

                if (profile) {
                    console.log('Profile exists:', profile.id);
                    // Store the profile ID for later use
                    await AsyncStorage.setItem('profile_id', profile.id);
                } else {
                    console.log('No profile found for this clerk_id');
                }

                // Get the custom JWT for Supabase
                const token = await getToken({ template: 'supabase' });
                if (token && isMounted) {
                    // Set skipProfileCheck to true to avoid redundant check
                    await updateSupabaseAuthToken(token, true);
                }
            } catch (error) {
                console.error('Error syncing Supabase auth:', error);
            } finally {
                if (isMounted) {
                    isProcessingRef.current = false;
                }
            }
        };

        syncSupabaseAuth();

        return () => {
            isMounted = false;
        };
    }, [getToken, isSignedIn, userId]); // Removed isProcessingAuth from dependencies

    return <>{children}</>;
}

export function ClerkProvider({ children }: { children: ReactNode }) {
    return (
        <BaseClerkProvider
            publishableKey={publishableKey as string}
            tokenCache={tokenCache}
        >
            <SupabaseAuthHandler>
                {children}
            </SupabaseAuthHandler>
        </BaseClerkProvider>
    );
}