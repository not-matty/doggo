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
      bundleIdentifier: "com.notmatty.doggo",
      infoPlist: {
        NSPhotoLibraryUsageDescription: "Allow doggo to access your photos to share images with friends.",
        NSCameraUsageDescription: "Allow doggo to use your camera to take profile pictures.",
        NSContactsUsageDescription: "Allow doggo to access your contacts to help you find your friends."
      }
    },
    android: {
      package: "com.notmatty.doggo",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_CONTACTS",
        "android.permission.INTERNET"
      ]
    },
    plugins: [
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          },
          "android": {
            "newArchEnabled": true,
            "kotlinVersion": "1.8.0"
          }
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow doggo to access your photos to share images with friends.",
          "cameraPermission": "Allow doggo to use your camera to take profile pictures."
        }
      ],
      [
        "expo-contacts",
        {
          "contactsPermission": "Allow doggo to access your contacts to help you find your friends."
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "8afa3833-7644-46b1-be2c-4d7acea8fd55"
      },
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
};
