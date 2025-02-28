import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { User } from '@navigation/types';
import { useAuth } from '@clerk/clerk-expo';
import { supabase, clerkIdToUuid, getCurrentUserUuid } from '@services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the state shape
interface AppState {
    profile: User | null;
    isLoadingProfile: boolean;
    error: string | null;
    lastSync: number | null;
}

// Define action types
type AppAction =
    | { type: 'SET_PROFILE'; payload: User }
    | { type: 'CLEAR_PROFILE' }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_LAST_SYNC'; payload: number };

// Create the context
const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
} | null>(null);

// Initial state
const initialState: AppState = {
    profile: null,
    isLoadingProfile: true,
    error: null,
    lastSync: null,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'SET_PROFILE':
            return { ...state, profile: action.payload, error: null };
        case 'CLEAR_PROFILE':
            return { ...state, profile: null };
        case 'SET_LOADING':
            return { ...state, isLoadingProfile: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'SET_LAST_SYNC':
            return { ...state, lastSync: action.payload };
        default:
            return state;
    }
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const { isSignedIn, userId } = useAuth();

    // Fetch profile data using either clerk_id or directly using the UUID
    const fetchProfile = async () => {
        try {
            if (!userId) return;

            dispatch({ type: 'SET_LOADING', payload: true });

            // Get the converted UUID from storage if available
            const clerkId = await AsyncStorage.getItem('clerk_user_id') || userId;
            
            // First try to fetch by clerk_id
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('clerk_id', clerkId)
                .single();

            if (error) {
                console.log('Error fetching by clerk_id, trying UUID conversion');
                
                // If that fails, try with UUID conversion
                const supabaseUuid = clerkIdToUuid(clerkId);
                
                const { data: profileByUuid, error: uuidError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', supabaseUuid)
                    .single();

                if (uuidError) {
                    throw uuidError;
                }

                if (profileByUuid) {
                    dispatch({ type: 'SET_PROFILE', payload: profileByUuid });
                    dispatch({ type: 'SET_LAST_SYNC', payload: Date.now() });
                } else {
                    // If we still can't find a profile, we may need to create one
                    console.log('No profile found, may need to create one');
                    dispatch({ type: 'SET_ERROR', payload: 'No profile found' });
                }
            } else if (profile) {
                dispatch({ type: 'SET_PROFILE', payload: profile });
                dispatch({ type: 'SET_LAST_SYNC', payload: Date.now() });
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to load profile' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    };

    // Refresh profile data
    const refreshProfile = async () => {
        const now = Date.now();
        if (state.lastSync && now - state.lastSync < CACHE_DURATION) {
            return; // Use cached data
        }
        await fetchProfile();
    };

    // Update profile data
    const updateProfile = async (updates: Partial<User>) => {
        try {
            if (!userId || !state.profile?.id) return;

            // Get the current user's UUID
            const profileId = state.profile.id;

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profileId)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                dispatch({ type: 'SET_PROFILE', payload: data });
                dispatch({ type: 'SET_LAST_SYNC', payload: Date.now() });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to update profile' });
            throw error;
        }
    };

    // Effect to handle auth state changes
    useEffect(() => {
        if (isSignedIn) {
            fetchProfile();
        } else {
            dispatch({ type: 'CLEAR_PROFILE' });
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [isSignedIn, userId]);

    return (
        <AppContext.Provider value={{ state, dispatch, refreshProfile, updateProfile }}>
            {children}
        </AppContext.Provider>
    );
}

// Custom hook to use the AppContext
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}