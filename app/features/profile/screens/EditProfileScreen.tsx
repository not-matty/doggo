import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '@context/AuthContext';
import { supabase } from '@services/supabase';
import { colors, spacing, typography, layout } from '@styles/theme';
import { User } from '@navigation/types';

const MAX_BIO_LENGTH = 150;

const EditProfileScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user: authUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bio, setBio] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            if (!authUser?.id) return;

            const { data: userData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            if (userData) {
                setBio(userData.bio || '');
                setName(userData.name || '');
                setUsername(userData.username || '');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            Alert.alert('Error', 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            if (!authUser?.id) {
                throw new Error('No authenticated user');
            }

            // Validate username
            if (username.length < 3) {
                Alert.alert('Invalid Username', 'Username must be at least 3 characters long');
                return;
            }

            // Check if username is taken (only if username changed)
            const { data: existingUser, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username.toLowerCase())
                .neq('id', authUser.id)
                .single();

            if (existingUser) {
                Alert.alert('Username Taken', 'Please choose a different username');
                return;
            }

            const updates = {
                bio,
                name,
                username: username.toLowerCase(),
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', authUser.id);

            if (error) throw error;

            Alert.alert('Success', 'Profile updated successfully');
            navigation.goBack();
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your name"
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Your username"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.section}>
                    <View style={styles.bioHeader}>
                        <Text style={styles.label}>Bio</Text>
                        <Text style={styles.charCount}>
                            {bio.length}/{MAX_BIO_LENGTH}
                        </Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.bioInput]}
                        value={bio}
                        onChangeText={(text) => {
                            if (text.length <= MAX_BIO_LENGTH) {
                                setBio(text);
                            }
                        }}
                        placeholder="Write a short bio about yourself"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        maxLength={MAX_BIO_LENGTH}
                    />
                </View>

                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        saving && styles.saveButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={colors.background} />
                    ) : (
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.xl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: typography.body.fontSize,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: layout.borderRadius.md,
        padding: spacing.md,
        fontSize: typography.body.fontSize,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.divider,
    },
    bioInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    bioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    charCount: {
        fontSize: typography.caption.fontSize,
        color: colors.textSecondary,
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: layout.borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.background,
        fontSize: typography.body.fontSize,
        fontWeight: '600',
    },
});

export default EditProfileScreen; 