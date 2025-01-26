// app/context/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@services/supabase';
import { Session, User, AuthApiError } from '@supabase/supabase-js';

interface AuthContextProps {
  user: User | null;
  signInWithPassword: (phone: string, password: string) => Promise<void>;
  signUpWithPhone: (phone: string, password: string, name: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  requestOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, token: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
      }
    );

    // Get active session if any
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in using phone + password
   */
  const signInWithPassword = async (phone: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });

    if (error) {
      console.error('signInWithPassword error:', error);
      throw error; // Propagate error to handle it in the UI
    }

    // 'data' should contain user session; user state is updated by listener
  };

  /**
   * Sign up a new user with phone + password
   */
  const signUpWithPhone = async (phone: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        channel: 'sms',
      },
    });

    if (error) {
      console.error('signUpWithPhone error:', error);
      throw error; // Propagate error to handle it in the UI
    }

    // If signUp is successful, Supabase will send an OTP to verify the phone
  };

  /**
   * Request an OTP for a given phone (to do a passwordless or 2FA step)
   */
  const requestOTP = async (phone: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) {
      console.error('requestOTP error:', error);
      throw error; // Propagate error to handle it in the UI
    }
  };

  /**
   * Verify an OTP token for phone
   */
  const verifyOTP = async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) {
      console.error('verifyOTP error:', error);
      throw error; // Propagate error to handle it in the UI
    }
  };

  /**
   * Sign out
   */
  const signOutUser = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signInWithPassword,
        signUpWithPhone,
        signOutUser,
        requestOTP,
        verifyOTP,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
