// app/navigation/types.ts

/** 
 * Root-level stack for switching between Auth flows vs. main app flows. 
 */
export type RootStackParamList = {
  AuthNavigator: undefined;
  MainNavigator: undefined;
  TabsNavigator: undefined;
  HomeNavigator: undefined;
  MessagesNavigator: undefined;
  SearchNavigator: undefined;
  ProfileNavigator: undefined;
  MessagesPeek: undefined;
  MessagesPage: undefined;
  ProfileDetails: { userId: string };
  // Add other Root stack screens or navigators here
};

/** 
 * Main stack after user is authenticated. 
 */
export type MainStackParamList = {
  Home: undefined;
  AddPhoto: undefined;
  ProfileDetails: { userId: string };
  Tabs: undefined; // If you navigate to "Tabs" from this stack
};

/** 
 * Authentication flow stack. 
 */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOTP: { phone: string };
  CompleteProfile: undefined; // Added CompleteProfile
  // Add other Auth stack screens here (e.g., ForgotPassword)
};

/** 
 * Bottom tab navigator: Home, Search, Profile. 
 */
export type TabsParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

/** 
 * Home stack: if you nest Home screens in a stack 
 */
export type HomeStackParamList = {
  HomePage: undefined;
  ProfileDetails: { userId: string };
  // Add other Home stack screens here
};

/** 
 * Search stack: if you nest Search screens in a stack 
 */
export type SearchStackParamList = {
  SearchPage: undefined;
  ProfileDetails: { userId: string };
};

/** 
 * Messages stack: 
 */
export type MessagesStackParamList = {
  MessagesPage: undefined;
  // Add other Messages stack screens here
};

/** 
 * Profile stack: 
 */
export type ProfileStackParamList = {
  ProfilePage: { userId: string };
  ProfileDetails: { userId: string };
  // Add other Profile stack screens here if needed
};

/**
 * Consolidated "User" type (matches Supabase 'profiles' table).
 */

export type User = {
  id: string;
  name: string;
  username: string;
  bio?: string;
  profile_picture_url?: string | null;
  phone: string;
  email?: string;
  likes: number;
  created_at: string;
  updated_at: string;
};


/** 
 * Photo type for images your users upload 
 */
export type Photo = {
  uri: string;    // Local or remote URI
  id: string;     // Unique ID in your DB or storage
  userId: string; // Foreign key referencing user's ID
};
