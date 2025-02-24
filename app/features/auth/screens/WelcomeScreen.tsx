import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '@navigation/types';
import { colors, spacing, typography, layout } from '@styles/theme';

type WelcomeScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const WelcomeScreen: React.FC = () => {
    const navigation = useNavigation<WelcomeScreenNavigationProp>();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Text style={styles.logo}>doggo</Text>
                    <Text style={styles.tagline}>ts so tuff</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.loginButton]}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={[styles.buttonText, styles.loginButtonText]}>Log In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.signupButton]}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={[styles.buttonText, styles.signupButtonText]}>Create Account</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xl * 2,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: spacing.xl * 3,
    },
    logo: {
        fontSize: 48,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.md,
    },
    tagline: {
        fontSize: typography.title.fontSize,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    buttonContainer: {
        width: '100%',
        marginBottom: spacing.xl,
    },
    button: {
        width: '100%',
        paddingVertical: spacing.lg,
        borderRadius: layout.borderRadius.lg,
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    loginButton: {
        backgroundColor: colors.primary,
    },
    signupButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    buttonText: {
        fontSize: typography.title.fontSize,
        fontWeight: '600',
    },
    loginButtonText: {
        color: colors.background,
    },
    signupButtonText: {
        color: colors.primary,
    },
});

export default WelcomeScreen; 