import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/types';
import * as Contacts from 'expo-contacts';
import { supabase, clerkIdToUuid } from '@services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

// Define the shape of our AuthContext
interface AuthContextProps {
    user: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    checkContactsPermission: () => Promise<boolean>;
    updateProfile: (data: Partial<Profile>) => Promise<void>;
}

// User profile type
export interface Profile {
    id: string;
    name: string;
    username: string;
    profile_picture_url?: string | null;
    bio?: string;
    phone?: string;
    clerk_id?: string;
    created_at?: string;
    updated_at?: string;
}

// Create the AuthContext
export const ClerkAuthContext = createContext<AuthContextProps | null>(null);

// Navigation type
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

// Hook to use AuthContext
export const useClerkAuthContext = () => {
    const context = useContext(ClerkAuthContext);
    if (!context) {
        throw new Error('useClerkAuthContext must be used within a ClerkAuthContextProvider');
    }
    return context;
};

// Auth provider component
export const ClerkAuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [contactsPermission, setContactsPermission] = useState<string>('undetermined');
    const clerkAuth = useClerkAuth();

    const signOut = async () => {
        try {
            console.log("Signing out...");

            // Clear any local storage items
            await AsyncStorage.removeItem('userPhone');
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('clerk_user_id');
            await AsyncStorage.removeItem('supabase_uuid');
            await AsyncStorage.removeItem('profile_id');
            await AsyncStorage.removeItem('last_profile_check');

            // Sign out of Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error("Supabase sign out error:", error);
            }

            // Sign out of Clerk
            if (clerkAuth && clerkAuth.signOut) {
                await clerkAuth.signOut();
            } else {
                console.warn("Clerk signOut method not available");
            }

            // Reset user state
            setUser(null);

            console.log("Successfully signed out");
        } catch (error: any) {
            console.error('Sign out error:', error);
            throw new Error(error.message);
        }
    };

    // Check contacts permission
    const checkContactsPermission = async (): Promise<boolean> => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            setContactsPermission(status);
            return status === 'granted';
        } catch (error) {
            console.error('Error checking contacts permission:', error);
            return false;
        }
    };

    // Update profile
    const updateProfile = async (updatedProfile: Partial<Profile>): Promise<void> => {
        if (!user || !user.id) {
            throw new Error('User not authenticated');
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updatedProfile)
                .eq('id', user.id);

            if (error) throw error;

            // Update local user state
            setUser({ ...user, ...updatedProfile });
        } catch (error: any) {
            console.error('Error updating profile:', error);
            throw new Error(error.message);
        }
    };

    // Effect for loading initial auth state
    useEffect(() => {
        const loadUser = async () => {
            try {
                setLoading(true);

                // Check if we have a clerk user
                if (!clerkAuth.userId) {
                    setLoading(false);
                    return;
                }

                // Convert Clerk ID to UUID format for Supabase
                const clerkUuid = clerkIdToUuid(clerkAuth.userId);

                // Get profile from Supabase
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('clerk_id', clerkUuid)
                    .single();

                if (profile) {
                    setUser(profile);
                } else if (error) {
                    console.error('Error fetching profile:', error);
                }
            } catch (error) {
                console.error('Error loading user:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [clerkAuth.userId]);

    // The value we'll provide to consumers
    const value = {
        user,
        loading,
        signOut,
        checkContactsPermission,
        updateProfile
    };

    return <ClerkAuthContext.Provider value={value}>{children}</ClerkAuthContext.Provider>;
};

export default ClerkAuthContextProvider; 