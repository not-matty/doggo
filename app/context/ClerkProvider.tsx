import React, { ReactNode, useEffect } from 'react';
import { ClerkProvider as BaseClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';
import { updateSupabaseAuthToken } from '@services/supabase';

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
    const { getToken, isSignedIn } = useAuth();

    useEffect(() => {
        let isMounted = true;

        const syncSupabaseAuth = async () => {
            try {
                if (!isSignedIn) {
                    await updateSupabaseAuthToken(null);
                    return;
                }

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
    }, [getToken, isSignedIn]);

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