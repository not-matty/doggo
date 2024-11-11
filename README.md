# App Directory Structure

## Overview
The app is organized using a feature-based structure to enhance modularity and scalability.

## Directory Breakdown

- **features/**
  - Contains feature-specific components, screens, and navigators.
  - Example: `auth/`, `home/`, `search/`, `profile/`, `messages/`

- **navigation/**
  - Houses all navigation-related files and type definitions.
  - `RootNavigator.tsx`: The root stack navigator handling global routes and modals.
  - `TabsNavigator.tsx`: Defines the bottom tab navigator.
  - `types.ts`: Contains TypeScript type definitions for navigation.

- **layouts/**
  - Includes layout components that wrap navigators or screens.
  - `GlobalLayout.tsx`: Provides a consistent layout with headers and footers.

- **components/common/**
  - Shared components used across multiple features.
  - Example: `Header.tsx`, `Footer.tsx`, `CustomHeader.tsx`, `MessageBubble.tsx`, `UserItem.tsx`

- **styles/**
  - Global and shared style definitions.
  - `globalStyles.ts`: Common styles applied throughout the app.

- **assets/**
  - Contains static assets like images, fonts, etc.
  - Example: `images/`, `fonts/`

## Adding a New Feature

1. **Create a Feature Folder:**
   - Inside `features/`, create a new folder for the feature.
   - Example: `features/settings/`

2. **Add Screens and Navigators:**
   - Create screen components within the feature folder.
   - If necessary, define a stack navigator for the feature.

3. **Update Navigation:**
   - Import and include the feature navigator in the appropriate parent navigator.

## Navigation Flow

- **RootNavigator**
  - Contains the `AuthNavigator` and `TabsNavigator`.
  - Manages global modals like `MessagesPeek`.

- **AuthNavigator**
  - Manages authentication-related screens (e.g., `Login`).

- **TabsNavigator**
  - Defines the bottom tabs: Home, Search, Profile.

- **Feature Navigators**
  - Each tab can have its own stack navigator for nested screens.

## State Management

- **Authentication State**: Managed within `RootNavigator` for simplicity. For a more robust solution, consider using a global state management tool or context.

## Styling

- Global styles are defined in `styles/globalStyles.ts`.
- Shared components use consistent styling from the global styles.

## Contribution Guidelines

- Follow the established directory structure when adding new features or components.
- Ensure type definitions are updated accordingly.
- Maintain consistency in naming conventions and coding styles.

doggo/
├── app/
│   ├── assets/
│   │   └── images/
│   │       └── Default_pfp.svg.png
│   ├── components/
│   │   └── common/
│   │       ├── CustomHeader.tsx
│   │       ├── Footer.tsx
│   │       ├── MessageBubble.tsx
│   │       └── UserItem.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthNavigator.tsx
│   │   │   └── LoginPage.tsx
│   │   ├── home/
│   │   │   ├── HomeNavigator.tsx
│   │   │   └── HomePage.tsx
│   │   ├── messages/
│   │   │   ├── MessagesNavigator.tsx
│   │   │   ├── MessagesPage.tsx
│   │   │   └── MessagesPeek.tsx
│   │   ├── profile/
│   │   │   ├── ProfileNavigator.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── ProfileDetailsPage.tsx
│   │   └── search/
│   │       └── SearchPage.tsx
│   ├── layouts/
│   │   └── GlobalLayout.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── TabsNavigator.tsx
│   │   └── types.ts
│   └── styles/
│       └── globalStyles.ts
├── App.tsx
├── app.json
├── babel.config.js
├── package.json
├── tsconfig.json
└── ...

