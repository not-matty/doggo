// app/styles/theme.ts

export const colors = {
    // Primary colors
    background: '#FFFFFF',
    surface: '#F8F8F8',
    primary: '#000000',
    secondary: '#666666',
    accent: '#0088CC',

    // Text colors
    textPrimary: '#000000',
    textSecondary: '#666666',
    textMuted: '#999999',

    // UI elements
    divider: '#EEEEEE',
    overlay: 'rgba(0, 0, 0, 0.5)',
    error: '#FF3B30',
    success: '#4CD964',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const typography = {
    header: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    title: {
        fontSize: 16,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 14,
        fontWeight: '400' as const,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
    },
};

export const layout = {
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
        xl: 24,
        full: 9999,
    },
    iconSize: {
        sm: 16,
        md: 24,
        lg: 32,
    },
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
}; 