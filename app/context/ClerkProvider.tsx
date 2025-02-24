import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { ClerkProvider as BaseClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Platform, ActivityIndicator, View, Text } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import { updateSupabaseAuthToken, supabase } from '@services/supabase';
import { colors } from '@styles/theme';

const createTokenCache = (): TokenCache => {
    return {
        getToken: async (key: string) => {
            try {
                return await SecureStore.getItemAsync(key);
            } catch (error) {
                console.error('SecureStore getToken error:', error);
                return null;
            }
        },
        saveToken: async (key: string, token: string) => {
            try {
                await SecureStore.setItemAsync(key, token);
            } catch (error) {
                console.error('SecureStore saveToken error:', error);
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
    const lastSignedInState = useRef<boolean | null>(null);
    const lastAuthState = useRef({ isLoaded, isSignedIn });

    useEffect(() => {
        let isMounted = true;

        const syncSupabaseAuth = async () => {
            try {
                if (!isLoaded) return;

                // Only clear session if we were previously signed in and now we're not
                if (!isSignedIn && lastSignedInState.current === true) {
                    await updateSupabaseAuthToken(null);
                    lastSignedInState.current = false;
                    return;
                }

                // Update token if signed in
                if (isSignedIn) {
                    const token = await getToken({ template: 'supabase' });
                    if (token && isMounted) {
                        await updateSupabaseAuthToken(token);
                        lastSignedInState.current = true;
                    }
                }
            } catch (error) {
                console.error('Error syncing Supabase auth:', error);
            }
        };

        // Only sync if auth state changed
        if (lastAuthState.current.isLoaded !== isLoaded ||
            lastAuthState.current.isSignedIn !== isSignedIn) {
            syncSupabaseAuth();
            lastAuthState.current = { isLoaded, isSignedIn };
        }

        // Set up periodic sync
        const intervalId = setInterval(syncSupabaseAuth, 60000); // Sync every minute

        return () => {
            isMounted = false;
            clearInterval(intervalId);
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