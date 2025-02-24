// app/context/AuthContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '@services/supabase';
import { User } from '@navigation/types';
import { navigate } from '@navigation/RootNavigation'; // Global navigation helper
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/types';

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

// Add this helper function at the top of the file
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

type RootNavigationProp = StackNavigationProp<RootStackParamList>;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<RootNavigationProp>();

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
  const getContactNameByPhone = async (phoneNumber: string): Promise<string> => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return 'Unknown';

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const normalizedSearchPhone = normalizePhoneNumber(phoneNumber);
      const contact = data.find(contact =>
        contact.phoneNumbers?.some(phone =>
          phone.number && normalizePhoneNumber(phone.number) === normalizedSearchPhone
        )
      );

      return contact ? (contact.name || 'Unknown') : 'Unknown';
    } catch (error) {
      console.error('Error getting contact name:', error);
      return 'Unknown';
    }
  };

  // Modify the createPlaceholderProfile function
  const createPlaceholderProfile = async (phoneNumber: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);

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

  // Modify the importContactsIfFirstLogin function
  const importContactsIfFirstLogin = async (currentUser: User) => {
    try {
      const hasImportedContacts = await AsyncStorage.getItem(`hasImportedContacts_${currentUser.id}`);
      const lastContactsUpdate = await AsyncStorage.getItem(`lastContactsUpdate_${currentUser.id}`);
      const now = new Date().getTime();
      const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      // If it's not first login, check if we should update contacts
      if (hasImportedContacts && lastContactsUpdate) {
        const timeSinceLastUpdate = now - parseInt(lastContactsUpdate);
        if (timeSinceLastUpdate < ONE_DAY) {
          return; // Skip if last update was less than 24 hours ago
        }
      }

      // Request permission if first time
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Contacts Access Required',
          'doggo needs access to your contacts to help you connect with friends. You can enable this in your settings.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            }
          ]
        );
        return;
      }

      // Fetch contacts from device
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (deviceContacts.length === 0) {
        console.log('No contacts found');
        return;
      }

      // Get existing unregistered contacts for this user
      const { data: existingContacts, error: fetchError } = await supabase
        .from('unregistered_contacts')
        .select('phone')
        .eq('user_id', currentUser.id);

      if (fetchError) throw fetchError;

      // Create a Set of existing phone numbers for faster lookup
      const existingPhones = new Set(existingContacts?.map(contact => contact.phone) || []);
      const contactsToProcess = [];

      // Get existing contacts to avoid duplicates
      const { data: existingRegisteredContacts, error: registeredError } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', currentUser.id);

      if (registeredError) throw registeredError;

      const existingContactIds = new Set(existingRegisteredContacts?.map(contact => contact.contact_user_id) || []);

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

              if (existingUser) {
                // Skip if we already have this contact
                if (!existingContactIds.has(existingUser.id)) {
                  // If the contact is a registered user, add to contacts table
                  const { error: contactError } = await supabase
                    .from('contacts')
                    .insert({
                      user_id: currentUser.id,
                      contact_user_id: existingUser.id,
                      created_at: new Date().toISOString()
                    });

                  if (contactError) console.error('Error adding contact:', contactError);
                }
              } else if (!existingPhones.has(normalizedPhone)) {
                // If not registered and not already in unregistered_contacts
                contactsToProcess.push({
                  user_id: currentUser.id,
                  phone: normalizedPhone,
                  created_at: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      // Process unregistered contacts in smaller batches to avoid conflicts
      const BATCH_SIZE = 50;
      for (let i = 0; i < contactsToProcess.length; i += BATCH_SIZE) {
        const batch = contactsToProcess.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('unregistered_contacts')
          .insert(batch)
          .select();

        if (insertError) {
          console.error('Error inserting batch:', insertError);
          // Continue with next batch even if this one fails
        }
      }

      // Update timestamps
      await AsyncStorage.setItem(`hasImportedContacts_${currentUser.id}`, 'true');
      await AsyncStorage.setItem(`lastContactsUpdate_${currentUser.id}`, now.toString());

      console.log(`Processed ${contactsToProcess.length} contacts for user:`, currentUser.id);
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
          navigation.navigate('AuthNavigator', { screen: 'CompleteProfile' });
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
  }, [navigation]);

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

      // First, check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (!existingUser) {
        throw new Error('No account found with this phone number. Please sign up first.');
      }

      // Generate OTP
      const generatedOTP = generateOTP();

      // Generate OTP via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) throw error;

      // Send custom SMS via Twilio Edge Function
      const { error: smsError } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: normalizedPhone,
          message: `Your doggo verification code is: ${generatedOTP}. Valid for 10 minutes.`,
        },
      });

      if (smsError) throw smsError;

      // Store OTP temporarily
      await AsyncStorage.setItem(`otp_${normalizedPhone}`, generatedOTP);
      // Set OTP expiry
      await AsyncStorage.setItem(`otp_expiry_${normalizedPhone}`, (Date.now() + 600000).toString()); // 10 minutes
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

      // Check if OTP is valid and not expired
      const storedOTP = await AsyncStorage.getItem(`otp_${normalizedPhone}`);
      const expiryTime = await AsyncStorage.getItem(`otp_expiry_${normalizedPhone}`);

      if (!storedOTP || !expiryTime) {
        throw new Error('OTP not found or expired. Please request a new one.');
      }

      if (Date.now() > parseInt(expiryTime)) {
        // Clean up expired OTP
        await AsyncStorage.removeItem(`otp_${normalizedPhone}`);
        await AsyncStorage.removeItem(`otp_expiry_${normalizedPhone}`);
        throw new Error('OTP has expired. Please request a new one.');
      }

      if (token !== storedOTP) {
        throw new Error('Invalid OTP. Please try again.');
      }

      // Clean up used OTP
      await AsyncStorage.removeItem(`otp_${normalizedPhone}`);
      await AsyncStorage.removeItem(`otp_expiry_${normalizedPhone}`);

      // Verify OTP via Edge Function
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          phone: normalizedPhone,
          token,
        },
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

  const signUpWithPhone = async (phone: string, password: string, name: string, username: string) => {
    try {
      const normalizedPhone = normalizePhoneNumber(phone);

      // Check if phone number is already registered
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (existingUser) {
        throw new Error('This phone number is already registered. Please log in instead.');
      }

      // Generate OTP for verification
      const generatedOTP = generateOTP();

      // Generate OTP via Supabase
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
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

        // Send verification SMS
        const { error: smsError } = await supabase.functions.invoke('send-sms', {
          body: {
            phone: normalizedPhone,
            message: `Welcome to doggo! Your verification code is: ${generatedOTP}. Valid for 10 minutes.`,
          },
        });

        if (smsError) throw smsError;

        // Store OTP temporarily
        await AsyncStorage.setItem(`otp_${normalizedPhone}`, generatedOTP);
        // Set OTP expiry
        await AsyncStorage.setItem(`otp_expiry_${normalizedPhone}`, (Date.now() + 600000).toString()); // 10 minutes
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
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
        signUpWithPhone,
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
