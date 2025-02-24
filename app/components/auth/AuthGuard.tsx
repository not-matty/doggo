import React, { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-expo';

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    signedIn?: boolean;
}

export const SignedIn: React.FC<AuthGuardProps> = ({ children, fallback = null }) => {
    const { isSignedIn } = useAuth();
    return isSignedIn ? <>{children}</> : <>{fallback}</>;
};

export const SignedOut: React.FC<AuthGuardProps> = ({ children, fallback = null }) => {
    const { isSignedIn } = useAuth();
    return !isSignedIn ? <>{children}</> : <>{fallback}</>;
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, signedIn = true, fallback = null }) => {
    const { isSignedIn } = useAuth();
    return isSignedIn === signedIn ? <>{children}</> : <>{fallback}</>;
}; 