// app.config.js

import 'dotenv/config';

export default {
  expo: {
    name: "doggo",
    slug: "doggo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./app/assets/images/icon.png",
    splash: {
      image: "./app/assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./app/assets/images/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      }
    },
    web: {
      favicon: "./app/assets/images/favicon.png"
    },
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
};
