import React, { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useApp } from '@context/AppContext';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@styles/theme';

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    signedIn?: boolean;
    requireProfile?: boolean;
}

const DefaultLoader = () => (
    <View style={{ padding: 10 }}>
        <ActivityIndicator size="small" color={colors.primary} />
    </View>
);

export const SignedIn: React.FC<AuthGuardProps> = ({
    children,
    fallback = null,
    requireProfile = false
}) => {
    const { isSignedIn } = useAuth();
    const { state: { profile, isLoadingProfile } } = useApp();

    // If we require a profile, check if it's loaded
    if (isSignedIn && requireProfile) {
        if (isLoadingProfile) {
            return <DefaultLoader />;
        }

        if (!profile) {
            return fallback ? <>{fallback}</> : <DefaultLoader />;
        }
    }

    return isSignedIn ? <>{children}</> : <>{fallback}</>;
};

export const SignedOut: React.FC<AuthGuardProps> = ({ children, fallback = null }) => {
    const { isSignedIn } = useAuth();
    return !isSignedIn ? <>{children}</> : <>{fallback}</>;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({
    children,
    signedIn = true,
    fallback = null,
    requireProfile = false
}) => {
    const { isSignedIn } = useAuth();
    const { state: { profile, isLoadingProfile } } = useApp();

    // First check auth status
    if (isSignedIn !== signedIn) {
        return <>{fallback}</>;
    }

    // Then check profile if required
    if (signedIn && requireProfile) {
        if (isLoadingProfile) {
            return <DefaultLoader />;
        }

        if (!profile) {
            return fallback ? <>{fallback}</> : <DefaultLoader />;
        }
    }

    return <>{children}</>;
}; 