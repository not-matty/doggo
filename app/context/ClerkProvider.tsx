import React, { ReactNode, useEffect } from 'react';
import { ClerkProvider as BaseClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import { updateSupabaseAuthToken, clerkIdToUuid } from '@services/supabase';
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

    useEffect(() => {
        let isMounted = true;

        const syncSupabaseAuth = async () => {
            try {
                if (!isSignedIn) {
                    await updateSupabaseAuthToken(null);
                    // Clear stored IDs on sign out
                    await AsyncStorage.removeItem('clerk_user_id');
                    await AsyncStorage.removeItem('supabase_uuid');
                    return;
                }

                // Store the Clerk user ID
                if (userId) {
                    await AsyncStorage.setItem('clerk_user_id', userId);
                    
                    // Also store the converted UUID for direct DB operations
                    const supabaseUuid = clerkIdToUuid(userId);
                    await AsyncStorage.setItem('supabase_uuid', supabaseUuid);
                }

                // Get the custom JWT for Supabase
                const token = await getToken({ template: 'supabase' });
                if (token && isMounted) {
                    await updateSupabaseAuthToken(token);
                }
            } catch (error) {
                console.error('Error syncing Supabase auth:', error);
            }
        };

        syncSupabaseAuth();

        return () => {
            isMounted = false;
        };
    }, [getToken, isSignedIn, userId]);

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