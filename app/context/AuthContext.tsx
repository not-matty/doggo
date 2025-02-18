// app/context/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '@services/supabase';
import { User } from '@navigation/types';
import { navigate } from '@navigation/RootNavigation'; // Global navigation helper
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the shape of our AuthContext
type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithPhone: (phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signUpWithPhone: (
    phone: string,
    password: string,
    name: string,
    username: string
  ) => Promise<void>;
  isUsernameTaken: (username: string) => Promise<boolean>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithPhone: async () => { },
  signOut: async () => { },
  verifyOtp: async () => { },
  signUpWithPhone: async () => { },
  isUsernameTaken: async () => false,
  updateProfile: async () => { },
});

type AuthProviderProps = {
  children: ReactNode;
};

// Add this type definition
interface ContactInfo {
  name: string;
  phoneNumber: string;
  givenName?: string;
  familyName?: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --------------------------
  // Helper: Normalize Phone Number
  // --------------------------
  // Removes all non-digit characters and, if the number is 10 digits (US), prepends "1"
  const normalizePhoneNumber = (phone: string): string => {
    let normalized = phone.replace(/[^0-9]/g, '');
    if (normalized.length === 10) {
      normalized = '1' + normalized;
    }
    return normalized;
  };

  // --------------------------
  // Helper: Request Contacts Permission
  // --------------------------
  const requestContactsPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        return true;
      }

      Alert.alert(
        'Contacts Permission Required',
        'Please grant access to your contacts to find your friends on doggo.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Grant Access',
            onPress: async () => {
              const { status: newStatus } = await Contacts.requestPermissionsAsync();
              return newStatus === 'granted';
            }
          }
        ]
      );
      return false;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  };

  // Add this new function
  const createPlaceholderProfile = async (contact: ContactInfo) => {
    try {
      const normalizedPhone = normalizePhoneNumber(contact.phoneNumber);

      // Check if a profile already exists for this phone number
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile:', checkError);
        return null;
      }

      // If profile exists, return it
      if (existingProfile) {
        return existingProfile.id;
      }

      // Create profile with only the required fields
      const profileData = {
        name: contact.name || `${contact.givenName || ''} ${contact.familyName || ''}`.trim() || 'Unknown User',
        phone: normalizedPhone,
        username: `user${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([profileData])
        .select('id')
        .single();

      if (insertError) {
        console.error('Profile creation error:', insertError);
        throw insertError;
      }
      return newProfile.id;
    } catch (error) {
      console.error('Error creating placeholder profile:', error);
      return null;
    }
  };

  // --------------------------
  // Function: Import Contacts If First Login
  // --------------------------
  const importContactsIfFirstLogin = async (currentUser: User) => {
    try {
      // Check if contacts have already been imported for this user
      const { data: existingContacts, error: fetchError } = await supabase
        .from('unregistered_contacts')
        .select('*')
        .eq('user_id', currentUser.id);

      if (fetchError) throw fetchError;

      if (existingContacts && existingContacts.length > 0) {
        console.log('Contacts already imported for user:', currentUser.id);
        return;
      }

      // Request permission to access contacts
      const permissionGranted = await requestContactsPermission();
      if (!permissionGranted) {
        console.log('Contacts permission not granted');
        return;
      }

      // Fetch contacts from device
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (deviceContacts.length === 0) {
        console.log('No contacts found');
        return;
      }

      const contactsToProcess = [];

      for (const contact of deviceContacts) {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          for (const phone of contact.phoneNumbers) {
            if (phone.number) {
              const normalizedPhone = normalizePhoneNumber(phone.number);

              // Check if this contact is already registered
              const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('phone', normalizedPhone)
                .single();

              if (!existingUser) {
                // Store unregistered contact
                contactsToProcess.push({
                  user_id: currentUser.id,
                  name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
                  phone: normalizedPhone,
                  created_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      if (contactsToProcess.length === 0) {
        console.log('No unregistered contacts to import');
        return;
      }

      // Insert all unregistered contacts
      const { error: insertError } = await supabase
        .from('unregistered_contacts')
        .insert(contactsToProcess);

      if (insertError) throw insertError;

      console.log(`Imported ${contactsToProcess.length} unregistered contacts for user:`, currentUser.id);
    } catch (error) {
      console.error('Error importing contacts:', error);
    }
  };

  // --------------------------
  // Listen for Authentication State Changes
  // --------------------------
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        console.log('Authenticated User ID:', session.user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile for user ID:', session.user.id, error);
          setUser(null);
          // Navigate to CompleteProfile (since profile isn't complete)
          navigate('CompleteProfile');
        } else {
          const fetchedUser = data as User;
          setUser(fetchedUser);
          console.log('Fetched Profile:', fetchedUser);
          // Import contacts if this is the first login
          await importContactsIfFirstLogin(fetchedUser);
        }
      } else {
        console.log('User signed out');
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (session.data.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.data.session.user.id)
          .single();

        if (profile) {
          setUser(profile);
          await importContactsIfFirstLogin(profile);
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phone: string) => {
    // Demo bypass
    if (phone === '+14082300023') {
      return;
    }

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message);
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    // Demo bypass
    if (phone === '+14082300023' && token === '123456') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();

      if (profile) {
        setUser(profile);
        await AsyncStorage.setItem('userPhone', phone);
        await AsyncStorage.setItem('userId', profile.id);
        return;
      }
    }

    try {
      const normalizedPhone = normalizePhoneNumber(phone);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        // Store credentials
        await AsyncStorage.setItem('userPhone', normalizedPhone);
        await AsyncStorage.setItem('userId', data.user.id);

        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          setUser(profile);
          await importContactsIfFirstLogin(profile);
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('userPhone');
      await AsyncStorage.removeItem('userId');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message);
    }
  };

  // --------------------------
  // Provide AuthContext Value
  // --------------------------
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithPhone,
        signOut,
        verifyOtp,
        signUpWithPhone: async (phone, password, name, username) => {
          try {
            const normalizedPhone = normalizePhoneNumber(phone);
            const { data, error } = await supabase.auth.signUp({
              phone: normalizedPhone,
              password,
            });
            if (error) throw error;

            if (data.user) {
              const { error: insertError } = await supabase
                .from('profiles')
                .insert([{
                  id: data.user.id,
                  name,
                  phone: normalizedPhone,
                  username,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }]);

              if (insertError) throw insertError;
            }
          } catch (error: any) {
            console.error('Sign up error:', error);
            throw new Error(error.message);
          }
        },
        isUsernameTaken: async (username: string): Promise<boolean> => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('username')
              .eq('username', username)
              .single();

            if (error && error.code === 'PGRST116') {
              return false;
            }
            return !!data;
          } catch (error) {
            console.error('Username check error:', error);
            return false;
          }
        },
        updateProfile: async (profile: Partial<User>) => {
          if (!user) throw new Error('No authenticated user');
          try {
            const { error } = await supabase
              .from('profiles')
              .update({
                ...profile,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);

            if (error) throw error;
            setUser(prev => prev ? { ...prev, ...profile } : null);
          } catch (error: any) {
            console.error('Profile update error:', error);
            throw new Error(error.message);
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
