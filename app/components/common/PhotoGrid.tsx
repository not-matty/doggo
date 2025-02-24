import React from 'react';
import {
    View,
    Image,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { Photo } from '@navigation/types';
import { colors, spacing, layout } from '@styles/theme';

interface PhotoGridProps {
    photos: Photo[];
    onPhotoPress: (photo: Photo) => void;
    loading?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPhotoPress, loading }) => {
    const renderColumn = (isRightColumn: boolean) => {
        const startIndex = isRightColumn ? 1 : 0;
        const columnPhotos = photos.filter((_, index) => index % 2 === startIndex);

        return (
            <View style={styles.column}>
                {columnPhotos.map((photo) => (
                    <TouchableOpacity
                        key={photo.id}
                        onPress={() => onPhotoPress(photo)}
                        style={styles.photoContainer}
                    >
                        <Image
                            source={{ uri: photo.url }}
                            style={styles.photo}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    if (loading) {
        return <ActivityIndicator style={styles.loading} color={colors.primary} />;
    }

    return (
        <View style={styles.container}>
            {renderColumn(false)}
            {renderColumn(true)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: spacing.sm,
    },
    column: {
        flex: 1,
        gap: spacing.sm,
    },
    photoContainer: {
        borderRadius: layout.borderRadius.md,
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        aspectRatio: 1,
    },
    loading: {
        marginTop: spacing.xl,
    },
});

export default PhotoGrid; 