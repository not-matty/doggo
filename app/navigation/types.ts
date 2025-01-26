// app/navigation/types.ts

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
export type MainStackParamList = {
  Home: undefined;
  AddPhoto: undefined;
  ProfileDetails: { userId: string };
  // Add other routes as needed
};
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOTP: { phone: string };
  // Add other Auth stack screens here (e.g., ForgotPassword)
};

export type TabsParamList = {
  Home: undefined;
  Search: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomePage: undefined;
  ProfileDetails: { userId: string };
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
  ProfilePage: { userId: string };
  ProfileDetails: { userId: string };
  // Add other Profile stack screens here if needed
};

// Define the Photo type
export type Photo = {
  uri: string;
  id: string;
  userId: string;
};
