// app/context/AuthContext.tsx

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { supabase } from '../services/supabase';
import { User } from '@navigation/types';
import { navigate } from '@navigation/RootNavigation'; // Global navigation helper
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

// Define the shape of our AuthContext
interface AuthContextProps {
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
  checkContactsPermission: () => Promise<boolean>;
}

// User profile type
interface Profile {
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
export const AuthContext = createContext<AuthContextProps | null>(null);

// Navigation type
type RootNavigationProp = StackNavigationProp<RootStackParamList>;

// Hook to use AuthContext
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthContextProvider');
  }
  return context;
};

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<RootNavigationProp>();
  const [contactsPermission, setContactsPermission] = useState<string>('undetermined');
  const clerkAuth = useClerkAuth();

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

  // Add this new helper function to match contacts with existing users
  const matchContactsWithUsers = async (currentUser: User, processedContacts: any[]) => {
    try {
      console.log('Matching contacts with existing users');
      // Get all phone numbers from processed contacts
      const phoneNumbers = processedContacts.map(contact => contact.phone_number);

      if (phoneNumbers.length === 0) {
        console.log('No phone numbers to match');
        return processedContacts;
      }

      // Look up profiles that match these phone numbers
      const { data: matchedProfiles, error } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('phone', phoneNumbers);

      if (error) {
        console.error('Error matching contacts with profiles:', error);
        throw error;
      }

      if (!matchedProfiles || matchedProfiles.length === 0) {
        console.log('No matching profiles found');
        return processedContacts;
      }

      console.log(`Found ${matchedProfiles.length} matching profiles`);

      // Create a map of phone number to profile id for quick lookup
      const phoneToProfileMap = matchedProfiles.reduce((map, profile) => {
        if (profile.phone) {
          map[normalizePhoneNumber(profile.phone)] = profile.id;
        }
        return map;
      }, {} as Record<string, string>);

      // Update processed contacts with contact_user_id where there's a match
      const updatedContacts = processedContacts.map(contact => {
        const matchedProfileId = phoneToProfileMap[contact.phone_number];
        if (matchedProfileId && matchedProfileId !== currentUser.id) {
          return {
            ...contact,
            contact_user_id: matchedProfileId
          };
        }
        return contact;
      });

      console.log(`Updated ${updatedContacts.filter(c => c.contact_user_id).length} contacts with user IDs`);
      return updatedContacts;
    } catch (error) {
      console.error('Error in matchContactsWithUsers:', error);
      // Return original contacts if there's an error
      return processedContacts;
    }
  };

  // Update the refreshContactsOnLogin function to use the matchContactsWithUsers function
  const refreshContactsOnLogin = async (currentUser: User) => {
    try {
      // Mark that the user has authenticated successfully
      await AsyncStorage.setItem(`hasAuthenticated_${currentUser.id}`, 'true');
      console.log(`User ${currentUser.id} authenticated, refreshing contacts`);

      // Check current permission status
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('Contacts permission not granted, marking as pending');
        // Mark as pending but don't prompt - we'll do this at a more appropriate time
        await AsyncStorage.setItem(`hasImportedContacts_${currentUser.id}`, 'false');
        return;
      }

      console.log('Contacts permission granted, importing contacts');
      // Permission is granted, fetch and import contacts
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
        ],
      });

      if (!data || data.length === 0) {
        console.log('No contacts found or empty contacts list');
        await AsyncStorage.setItem(`hasImportedContacts_${currentUser.id}`, 'true');
        await AsyncStorage.setItem(`lastContactsUpdate_${currentUser.id}`, new Date().getTime().toString());
        return;
      }

      console.log(`Found ${data.length} contacts, processing for import`);
      // Process contacts to extract needed information
      const processedContacts = data
        .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => {
          // Process each phone number
          return contact.phoneNumbers?.map(phone => ({
            user_id: currentUser.id,
            name: contact.name || 'Unknown',
            phone_number: normalizePhoneNumber(phone.number || ''),
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            imported_at: new Date().toISOString(),
          })) || [];
        })
        .flat()
        .filter(contact => contact.phone_number.length >= 10); // Ensure valid phone numbers

      if (processedContacts.length === 0) {
        console.log('No valid contacts found after processing');
        await AsyncStorage.setItem(`hasImportedContacts_${currentUser.id}`, 'true');
        await AsyncStorage.setItem(`lastContactsUpdate_${currentUser.id}`, new Date().getTime().toString());
        return;
      }

      // Match contacts with existing user profiles
      const matchedContacts = await matchContactsWithUsers(currentUser, processedContacts);

      console.log(`Saving ${matchedContacts.length} contacts to database`);
      // Batch insert contacts into database
      // First, get existing contacts to avoid duplicates
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('phone_number')
        .eq('user_id', currentUser.id);

      if (fetchError) {
        console.error('Error fetching existing contacts:', fetchError);
        throw fetchError;
      }

      // Create a set of existing phone numbers for quick lookup
      const existingPhoneNumbers = new Set(
        existingContacts?.map(contact => contact.phone_number) || []
      );

      // Filter out existing contacts
      const newContacts = matchedContacts.filter(
        contact => !existingPhoneNumbers.has(contact.phone_number)
      );

      if (newContacts.length > 0) {
        console.log(`Inserting ${newContacts.length} new contacts`);
        // Break into smaller batches to avoid payload size limits
        const batchSize = 100;
        for (let i = 0; i < newContacts.length; i += batchSize) {
          const batch = newContacts.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('contacts')
            .upsert(batch, { onConflict: 'user_id,phone_number' });

          if (insertError) {
            console.error(`Error inserting contacts batch ${i}-${i + batch.length}:`, insertError);
            throw insertError;
          }
        }
        console.log('Successfully imported contacts');
      } else {
        console.log('No new contacts to import');
      }

      // Update existing contacts for matches
      const existingContactsToUpdate = matchedContacts.filter(
        contact => existingPhoneNumbers.has(contact.phone_number) && contact.contact_user_id
      );

      if (existingContactsToUpdate.length > 0) {
        console.log(`Updating ${existingContactsToUpdate.length} existing contacts with user matches`);

        for (const contact of existingContactsToUpdate) {
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              contact_user_id: contact.contact_user_id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', currentUser.id)
            .eq('phone_number', contact.phone_number);

          if (updateError) {
            console.error(`Error updating contact match for ${contact.phone_number}:`, updateError);
            // Continue with other updates even if one fails
          }
        }
      }

      // Mark contacts as imported
      await AsyncStorage.setItem(`hasImportedContacts_${currentUser.id}`, 'true');
      await AsyncStorage.setItem(`lastContactsUpdate_${currentUser.id}`, new Date().getTime().toString());
      return true;
    } catch (error) {
      console.error('Error in refreshContactsOnLogin:', error);
      // Even if there's an error, don't set hasImportedContacts to false if it was true before
      // This prevents repeated attempts if there's a persistent error
      return false;
    }
  };

  // New function to check contacts permission at appropriate times
  const checkContactsPermission = async () => {
    if (!user) return false;

    try {
      // Check if we've already imported contacts
      const hasImportedContacts = await AsyncStorage.getItem(`hasImportedContacts_${user.id}`);

      // If already imported, no need to check
      if (hasImportedContacts === 'true') {
        console.log('Contacts already imported, skipping permission check');
        return true;
      }

      console.log('Checking contacts permission status');
      // Check current permission status
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        // Permission already granted, mark as imported
        console.log('Contacts permission already granted');
        await AsyncStorage.setItem(`hasImportedContacts_${user.id}`, 'true');
        await AsyncStorage.setItem(`lastContactsUpdate_${user.id}`, new Date().getTime().toString());
        return true;
      }

      // Request permission with a clear prompt
      console.log('Requesting contacts permission');
      const { status: newStatus } = await Contacts.requestPermissionsAsync();
      if (newStatus === 'granted') {
        // Permission granted, mark as imported
        console.log('Contacts permission granted');
        await AsyncStorage.setItem(`hasImportedContacts_${user.id}`, 'true');
        await AsyncStorage.setItem(`lastContactsUpdate_${user.id}`, new Date().getTime().toString());
        return true;
      }

      // User denied permission, show friendly explanation
      console.log('Contacts permission denied, showing explanation alert');
      Alert.alert(
        'Find Friends on doggo',
        'doggo works best when you can connect with friends. Enabling contacts access helps you find people you know who are already using the app.',
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings()
          }
        ]
      );
      return false;
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
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
          // Refresh contacts on login
          await refreshContactsOnLogin(fetchedUser);
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
          await refreshContactsOnLogin(profile);
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
          await refreshContactsOnLogin(profile);
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.message);
    }
  };

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
        checkContactsPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
