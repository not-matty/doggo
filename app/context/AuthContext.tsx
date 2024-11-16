// app/context/AuthContext.tsx

import React, { createContext, useState, useEffect } from 'react';
import { Profile } from '@navigation/types';
import { supabase } from '@services/supabase';
import { demoProfiles } from '@data/demoProfiles';

type AuthContextType = {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  userProfile?: Profile;
  setUserProfile: (profile: Profile | undefined) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  userProfile: undefined,
  setUserProfile: () => {},
  signIn: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<Profile | undefined>(undefined);

  useEffect(() => {
    // Get the current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setIsAuthenticated(false);
      } else {
        if (data.session) {
          setIsAuthenticated(true);
          fetchUserProfile(data.session.user.id);
        } else {
          setIsAuthenticated(false);
        }
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        fetchUserProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setUserProfile(undefined);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      // Fallback to demo profiles
      const demoUser = demoProfiles.find((profile) => profile.id === userId);
      setUserProfile(demoUser);
    } else {
      setUserProfile(data as Profile);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error signing in:', error);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, setIsAuthenticated, userProfile, setUserProfile, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
