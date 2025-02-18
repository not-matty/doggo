import React from 'react';
import {
    Modal,
    View,
    Image,
    TouchableOpacity,
    StyleSheet,
    Text,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Feather from 'react-native-vector-icons/Feather';
import { colors, typography, shadows } from '@styles/theme';
import { supabase } from '@services/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SCREEN_PADDING = 24;
const CONTENT_WIDTH = SCREEN_WIDTH - (SCREEN_PADDING * 2);
const CONTENT_HEIGHT = SCREEN_HEIGHT - 100 - (SCREEN_PADDING * 2); // Account for header and padding

interface PhotoViewerProps {
    visible: boolean;
    photo: {
        url: string;
        caption?: string;
        id: string;
        user_id: string;
    } | null;
    onClose: () => void;
    onDelete?: (photoId: string) => void;
    isOwner?: boolean;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({ visible, photo, onClose, onDelete, isOwner }) => {
    if (!photo) return null;

    const handleDelete = async () => {
        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Extract filename from URL
                            const fileName = photo.url.split('/').pop();
                            if (!fileName) throw new Error('Invalid file URL');

                            // Delete from Supabase storage
                            const { error: storageError } = await supabase.storage
                                .from('posts')
                                .remove([fileName]);

                            if (storageError) throw storageError;

                            // Delete from photos table
                            const { error: dbError } = await supabase
                                .from('photos')
                                .delete()
                                .eq('id', photo.id);

                            if (dbError) throw dbError;

                            // Call onDelete callback to update UI
                            onDelete?.(photo.id);
                            onClose();
                        } catch (error: any) {
                            console.error('Error deleting photo:', error);
                            Alert.alert('Error', 'Failed to delete photo. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onClose}
                    >
                        <Feather name="chevron-left" size={28} color={colors.textPrimary} />
                    </TouchableOpacity>

                    {isOwner && (
                        <TouchableOpacity
                            style={styles.menuButton}
                            onPress={handleDelete}
                        >
                            <Feather name="more-vertical" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.imageContainer}>
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: photo.url }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>
                    {photo.caption && (
                        <BlurView intensity={100} style={styles.captionContainer}>
                            <Text style={styles.caption}>{photo.caption}</Text>
                        </BlurView>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        zIndex: 1,
    },
    backButton: {
        padding: 8,
    },
    menuButton: {
        padding: 8,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: SCREEN_PADDING,
    },
    imageWrapper: {
        width: CONTENT_WIDTH,
        height: CONTENT_HEIGHT,
        backgroundColor: colors.background,
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.background,
    },
    captionContainer: {
        position: 'absolute',
        bottom: SCREEN_PADDING,
        left: SCREEN_PADDING,
        right: SCREEN_PADDING,
        padding: 15,
    },
    caption: {
        color: colors.textPrimary,
        fontSize: typography.body.fontSize,
        fontFamily: 'System',
        fontWeight: '400',
    },
});

export default PhotoViewer; 