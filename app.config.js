// app.config.js

import 'dotenv/config';

export default {
  expo: {
    name: "doggo",
    slug: "doggo",
    version: "1.0.0",
    orientation: "portrait",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.notmatty.doggo"
    },
    android: {
      package: "com.notmatty.doggo"
    },
    extra: {
      eas: {
        projectId: "8afa3833-7644-46b1-be2c-4d7acea8fd55"
      },
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
};
