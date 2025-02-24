import React, { ReactNode, useEffect, useRef } from 'react';
import { ClerkProvider as BaseClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import { updateSupabaseAuthToken } from '@services/supabase';

const createTokenCache = (): TokenCache => {
    return {
        getToken: async (key: string) => {
            try {
                return await SecureStore.getItemAsync(key);
            } catch (error) {
                console.error('SecureStore getToken error:', error);
                await SecureStore.deleteItemAsync(key);
                return null;
            }
        },
        saveToken: async (key: string, token: string) => {
            try {
                await SecureStore.setItemAsync(key, token);
            } catch (error) {
                console.error('SecureStore saveToken error:', error);
                // Attempt to clean up on error
                try {
                    await SecureStore.deleteItemAsync(key);
                } catch (cleanupError) {
                    console.error('Failed to cleanup after token save error:', cleanupError);
                }
            }
        },
    };
};

// SecureStore is not supported on web
const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;

// Ensure publishableKey is available and valid
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
    throw new Error('Missing Clerk Publishable Key');
}

// Component to handle Supabase auth token updates
function SupabaseAuthHandler({ children }: { children: ReactNode }) {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const initialSyncDone = useRef(false);
    const syncTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        let isMounted = true;

        const syncSupabaseAuth = async () => {
            try {
                if (!isLoaded) {
                    console.log('Clerk not loaded yet, waiting...');
                    return;
                }

                // Clear Supabase session if user is not signed in
                if (!isSignedIn) {
                    console.log('User not signed in, clearing Supabase session');
                    await updateSupabaseAuthToken(null);
                    return;
                }

                // Get the JWT token from Clerk
                const token = await getToken({ template: 'supabase' });
                console.log('Got token from Clerk:', token ? 'yes' : 'no');

                if (token && isMounted) {
                    // Update the Supabase client with the new token
                    const session = await updateSupabaseAuthToken(token);
                    console.log('Updated Supabase session:', session ? 'yes' : 'no');
                }
            } catch (error) {
                console.error('Error syncing Supabase auth:', error);
                // If there's an error, try again in 5 seconds
                if (isMounted) {
                    syncTimeoutRef.current = setTimeout(syncSupabaseAuth, 5000);
                }
            } finally {
                initialSyncDone.current = true;
            }
        };

        // Initial sync
        if (!initialSyncDone.current) {
            syncSupabaseAuth();
        }

        // Set up periodic sync
        const intervalId = setInterval(syncSupabaseAuth, 60000); // Sync every minute

        return () => {
            isMounted = false;
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            clearInterval(intervalId);
            // Clear Supabase session on unmount
            updateSupabaseAuthToken(null).catch(console.error);
        };
    }, [getToken, isLoaded, isSignedIn]);

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