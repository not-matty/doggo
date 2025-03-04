// app/navigation/types.ts

/** 
 * Root-level stack for switching between Auth flows vs. main app flows. 
 */
export type RootStackParamList = {
  AuthNavigator: { screen: keyof AuthStackParamList } | undefined;
  MainNavigator: undefined;
  TabsNavigator: undefined;
  HomeNavigator: undefined;
  MessagesNavigator: undefined;
  SearchNavigator: undefined;
  ProfileNavigator: undefined;
  MessagesPeek: undefined;
  MessagesPage: undefined;
  ProfileDetails: {
    userId: string;
    placeholderContact?: {
      name: string;
      phone_number: string;
      is_placeholder: boolean;
    }
  };
  // Add other Root stack screens or navigators here
};

/** 
 * Main stack after user is authenticated. 
 */
export type MainStackParamList = {
  Tabs: undefined;
  AddPhoto: undefined;
  Home: undefined;
  ProfileDetails: {
    userId: string;
    placeholderContact?: {
      name: string;
      phone_number: string;
      is_placeholder: boolean;
    }
  };
};

/** 
 * Authentication flow stack. 
 */
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyOTP: { phone: string };
  CompleteProfile: undefined;
  // Add other Auth stack screens here (e.g., ForgotPassword)
};

/** 
 * Bottom tab navigator: Home, Search, Upload, Likes, Profile. 
 */
export type TabsParamList = {
  Home: undefined;
  Search: undefined;
  Upload: undefined;
  Likes: undefined;
  Profile: undefined;
};

/** 
 * Home stack: if you nest Home screens in a stack 
 */
export type HomeStackParamList = {
  HomePage: undefined;
  ProfileDetails: {
    userId: string;
    placeholderContact?: {
      name: string;
      phone_number: string;
      is_placeholder: boolean;
    }
  };
};

/** 
 * Search stack: if you nest Search screens in a stack 
 */
export type SearchStackParamList = {
  SearchPage: undefined;
  ProfileDetails: {
    userId: string;
    placeholderContact?: {
      name: string;
      phone_number: string;
      is_placeholder: boolean;
    }
  };
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
  ProfilePage: undefined;
  ProfileDetails: {
    userId: string;
    placeholderContact?: {
      name: string;
      phone_number: string;
      is_placeholder: boolean;
    }
  };
  EditProfile: undefined;
  // Add other Profile stack screens here if needed
};

/**
 * Post type matching the 'posts' table
 */
export type Post = {
  id: string;
  user_id: string;
  url: string;
  caption?: string;
  created_at: string;
  user?: User;
};

/**
 * User type matching the 'profiles' table
 */
export type User = {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string | null;
  email?: string;
  phone?: string;
  likes?: number;
  bio?: string;
  created_at: string;
  updated_at: string;
  is_placeholder?: boolean;
  clerk_id: string;
};
