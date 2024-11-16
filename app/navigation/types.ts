// app/navigation/types.ts

export type RootStackParamList = {
  Auth: undefined;         // Auth flow
  Tabs: undefined;         // Main app tabs
  MessagesPeek: undefined; // Global modal
  MessagesPage: undefined; // Messages stack
  // Add other global routes here
};

export type AuthStackParamList = {
  Login: undefined;
  // Add other Auth stack screens here (e.g., Register, ForgotPassword)
};

export type TabsParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomePage: undefined;
  // Add other Home stack screens here
};

export type SearchStackParamList = {
  SearchPage: undefined;
  ProfileDetails: { userId: string };
  // Add other Search stack screens here
};

export type MessagesStackParamList = {
  MessagesPage: undefined;
  // Add other Messages stack screens here
};

export type ProfileStackParamList = {
  ProfilePage: undefined;
  ProfileDetails: { userId: string };
  // Add other Profile stack screens here if needed
};

export type User = {
  id: number;
  name: string;
  photos: string[]; // Array of image URIs
};
