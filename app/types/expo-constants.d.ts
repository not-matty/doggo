// app/types/expo-constants.d.ts

import 'expo-constants';

declare module 'expo-constants' {
  export interface ManifestExtra {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    // Add other environment variables here
  }

  export interface ExpoConfig {
    extra: ManifestExtra;
  }

  export interface Constants {
    expoConfig: ExpoConfig;
  }
}
