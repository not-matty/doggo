import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { User } from '@navigation/types';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '@services/supabase';

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

    // Fetch profile data
    const fetchProfile = async () => {
        try {
            if (!userId) return;

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('clerk_id', userId)
                .single();

            if (error) throw error;

            if (profile) {
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

            const { data, error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', state.profile.id)
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