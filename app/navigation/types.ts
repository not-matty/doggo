// app/navigation/types.ts

export type RootStackParamList = {
  AuthNavigator: undefined;
  TabsNavigator: undefined;
  HomeNavigator: undefined;
  MessagesNavigator: undefined;
  SearchNavigator: undefined;
  ProfileNavigator: undefined;
  MessagesPeek: undefined;
  MessagesPage: undefined;
  // Add other Root stack screens or navigators here
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
  ProfilePage: { userId: string };
  ProfileDetails: { userId: string };
  // Add other Profile stack screens here if needed
};

export type MainStackParamList = RootStackParamList;

export type Photo = number; // Since require returns a number in React Native

export type Profile = {
  id: string;
  name: string;
  photos: Photo[];
};
