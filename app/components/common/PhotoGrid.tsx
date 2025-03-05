import React, { memo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Dimensions } from 'react-native';
import { colors } from '@styles/theme';
import CachedImage from './CachedImage';
import { GridSkeleton } from './SkeletonLoader';

// Get window dimensions for layout calculations
const { width } = Dimensions.get('window');

// Layout constants (matching ProfileScreen)
const HEADER_PADDING = 16;
const PHOTO_GAP = 16;
const GALLERY_COLUMN_WIDTH = (width - (HEADER_PADDING * 2) - PHOTO_GAP) / 2;

/**
 * Photo interface defining the shape of photo objects for the grid
 */
interface Photo {
    id: string;
    url: string;
    [key: string]: any; // Allow additional properties
}

interface PhotoGridProps {
    photos: Photo[] | null | undefined;
    onPhotoPress: (photo: Photo) => void;
    loading?: boolean;
    columns?: number;
    emptyMessage?: string;
}

/**
 * PhotoGrid - Displays a grid of photos with layout matching the ProfileScreen
 * and handling for empty or invalid data
 */
const PhotoGrid: React.FC<PhotoGridProps> = ({
    photos,
    onPhotoPress,
    loading,
    columns = 2,
    emptyMessage = "No photos to display"
}) => {
    // Store image heights for maintaining aspect ratios
    const [imageHeights, setImageHeights] = useState<Record<string, number>>({});

    // If loading, show skeleton loader
    if (loading) {
        return <GridSkeleton columns={columns} items={columns * 2} />;
    }

    // Handle no photos or empty array
    if (!photos || photos.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
        );
    }

    // Filter out invalid photos to prevent errors
    const validPhotos = photos.filter(photo => {
        if (!photo || !photo.id || !photo.url) {
            console.warn('PhotoGrid: Received invalid photo item', photo);
            return false;
        }
        return true;
    });

    // Distribute photos between columns to balance layout
    const leftColumnPhotos: Photo[] = [];
    const rightColumnPhotos: Photo[] = [];

    // Distribute photos between columns
    validPhotos.forEach((photo, index) => {
        if (index % 2 === 0) {
            leftColumnPhotos.push(photo);
        } else {
            rightColumnPhotos.push(photo);
        }
    });

    // Render a column of photos
    const renderColumn = (photos: Photo[], isRightColumn: boolean) => {
        return (
            <View
                style={[
                    styles.column,
                    { marginLeft: isRightColumn ? PHOTO_GAP : 0 }
                ]}
            >
                {photos.map((photo) => (
                    <TouchableOpacity
                        key={photo.id}
                        style={[
                            styles.photoContainer,
                            {
                                width: GALLERY_COLUMN_WIDTH,
                                height: imageHeights[photo.id] || GALLERY_COLUMN_WIDTH,
                                marginBottom: PHOTO_GAP,
                            }
                        ]}
                        onPress={() => onPhotoPress(photo)}
                        accessibilityLabel={`Photo ${photo.id}`}
                        accessibilityRole="image"
                    >
                        <CachedImage
                            source={{ uri: photo.url }}
                            style={styles.photoImage}
                            fallbackSource={require('@assets/images/placeholder.png')}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.galleryContainer}>
            {renderColumn(leftColumnPhotos, false)}
            {renderColumn(rightColumnPhotos, true)}
        </View>
    );
};

const styles = StyleSheet.create({
    galleryContainer: {
        flexDirection: 'row',
        paddingHorizontal: HEADER_PADDING,
        width: '100%',
    },
    column: {
        flex: 1,
    },
    photoContainer: {
        backgroundColor: colors.surface,
        overflow: 'hidden',
        borderRadius: 8,
    },
    photoImage: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surface,
    },
    emptyContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: HEADER_PADDING,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
    }
});

export default memo(PhotoGrid); 