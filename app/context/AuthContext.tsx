// app/context/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@navigation/types';
import { supabase } from '@services/supabase';
import Contacts from 'react-native-contacts';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';

type AuthContextType = {
  user: User | null;
  signInWithPassword: (phone: string, password: string) => Promise<void>;
  signUpWithPhone: (
    phone: string,
    password: string,
    name: string,
    username: string
  ) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  isUsernameTaken: (username: string) => Promise<boolean>;
  updateProfile: (profile: Partial<User>) => Promise<void>; // Added
  // ...other methods
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  signInWithPassword: async () => {},
  signUpWithPhone: async () => {},
  verifyOtp: async () => {},
  signOut: async () => {},
  isUsernameTaken: async () => false,
  updateProfile: async () => {},
});

type AuthProviderProps = {
  children: ReactNode;
};

type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigation = useNavigation<AuthNavigationProp>();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          console.log('Authenticated User ID:', session.user.id);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error(
              'Error fetching profile for user ID:',
              session.user.id,
              error
            );
            setUser(null);

            // Navigate to CompleteProfile
            navigation.navigate('CompleteProfile');
          } else {
            const fetchedUser = data as User;
            setUser(fetchedUser);
            console.log('Fetched Profile:', fetchedUser);

            // Import contacts if it's the first login
            await importContactsIfFirstLogin(fetchedUser);
          }
        } else {
          console.log('User signed out');
          setUser(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [navigation]);

  const signInWithPassword = async (phone: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      phone: phone.toString(),
      password,
    });

    if (error) {
      console.error('Sign In Error:', error);
      throw error;
    }

    console.log('User signed in');
  };

  const signUpWithPhone = async (
    phone: string,
    password: string,
    name: string,
    username: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        phone: phone.toString(),
        password,
      });

      if (error) {
        console.error('Sign Up Error:', error);
        throw error;
      }

      console.log('User signed up:', data.user?.id);

      // Insert into 'profiles' table with username
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: data.user?.id, name, phone, username }]); // Added username

      if (insertError) {
        console.error('Profile Insertion Error:', insertError);
        throw insertError;
      }

      console.log('Profile created for user:', data.user?.id);
    } catch (error) {
      console.error('Sign Up Flow Error:', error);
      throw error;
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.toString(),
      token,
      type: 'sms',
    });

    if (error) {
      console.error('OTP Verification Error:', error);
      throw error;
    }

    console.log('OTP verified successfully');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }

    console.log('User signed out successfully');
  };

  const isUsernameTaken = async (username: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (error && error.code === 'PGRST116') {
      // No matching username found
      return false;
    } else if (data) {
      // Username exists
      return true;
    } else {
      // Some other error occurred
      console.error('Error checking username:', error);
      throw error;
    }
  };

  const updateProfile = async (profile: Partial<User>) => {
    if (!user) {
      throw new Error('No authenticated user.');
    }

    const { id, ...updates } = profile;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Update Profile Error:', error);
      throw error;
    }

    // Update local user state
    setUser((prevUser) => (prevUser ? { ...prevUser, ...updates } : prevUser));
  };

  // Function to handle contacts import
  const importContactsIfFirstLogin = async (currentUser: User) => {
    try {
      // Check if contacts are already imported
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', currentUser.id);

      if (fetchError) {
        console.error('Error fetching existing contacts:', fetchError);
        return;
      }

      if (existingContacts && existingContacts.length > 0) {
        // Contacts already imported
        console.log('Contacts already imported for user:', currentUser.id);
        return;
      }

      // Request permission to access contacts
      const permissionGranted = await requestContactsPermission();
      if (!permissionGranted) {
        Alert.alert('Contacts Permission', 'Cannot import contacts without permission.');
        return;
      }

      // Fetch contacts from device
      const deviceContacts = await Contacts.getAll();

      const contactUserIds: string[] = [];

      for (const contact of deviceContacts) {
        if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          for (const phone of contact.phoneNumbers) {
            const normalizedPhone = normalizePhoneNumber(phone.number);

            // Query 'profiles' table to find user with this phone number
            const { data, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('phone', normalizedPhone)
              .single();

            if (error) {
              // User with this phone number doesn't exist or other error
              console.log(`No user found with phone: ${normalizedPhone}`);
              continue;
            }

            if (data && data.id !== currentUser.id) {
              contactUserIds.push(data.id);
            }
          }
        }
      }

      if (contactUserIds.length === 0) {
        Alert.alert('No Contacts Found', 'No matching contacts found in our app.');
        return;
      }

      // Remove duplicates
      const uniqueContactUserIds = Array.from(new Set(contactUserIds));

      // Insert contacts into 'contacts' table
      const contactsToInsert = uniqueContactUserIds.map((contactId) => ({
        user_id: currentUser.id,
        contact_user_id: contactId,
      }));

      const { error: insertError } = await supabase.from('contacts').insert(contactsToInsert);

      if (insertError) {
        console.error('Error inserting contacts:', insertError);
        throw insertError;
      }

      Alert.alert('Contacts Imported', 'Your contacts have been successfully imported.');
      console.log('Contacts imported successfully for user:', currentUser.id);
    } catch (error: any) {
      console.error('Error importing contacts:', error);
      Alert.alert('Error', 'Failed to import contacts.');
    }
  };

  // Function to request contacts permission
  const requestContactsPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        const permission = await Contacts.requestPermission();
        return permission === 'authorized';
      } else if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'This app would like to view your contacts.',
            buttonPositive: 'Please accept',
          }
        );
        return permission === PermissionsAndroid.RESULTS.GRANTED;
      }
      return false;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  // Function to normalize phone numbers
  const normalizePhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    let normalized = phone.replace(/[^0-9]/g, '');

    // Handle country codes
    // Example: Ensure it starts with '1' for USA
    if (normalized.length === 10) {
      normalized = '1' + normalized;
    }

    return normalized;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signInWithPassword,
        signUpWithPhone,
        verifyOtp,
        signOut,
        isUsernameTaken,
        updateProfile, // Exposed
        // ...other methods
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
