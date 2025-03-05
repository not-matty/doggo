import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface SkeletonLoaderProps {
    style?: ViewStyle;
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
}

/**
 * SkeletonLoader component that shows a pleasant loading animation
 * instead of a spinner, giving the UI a more polished feeling
 */
const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    style,
    width = '100%',
    height = 20,
    borderRadius = 4,
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Create pulse animation
        const pulseAnimation = Animated.sequence([
            Animated.timing(opacity, {
                toValue: 0.7,
                duration: 800,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0.3,
                duration: 800,
                easing: Easing.ease,
                useNativeDriver: true,
            }),
        ]);

        // Run the animation in a loop
        Animated.loop(pulseAnimation).start();

        return () => {
            opacity.stopAnimation();
        };
    }, [opacity]);

    // Cast the style to any to work around TypeScript's strict checking
    const animatedStyle = {
        width: width === '100%' ? '100%' : typeof width === 'number' ? width : 'auto',
        height: height === '100%' ? '100%' : typeof height === 'number' ? height : 'auto',
        borderRadius,
        opacity,
    } as any;

    return (
        <Animated.View
            style={[
                styles.skeleton,
                animatedStyle,
                style,
            ]}
        />
    );
};

/**
 * ProfileSkeleton - Shows a skeleton for profile details
 */
export const ProfileSkeleton: React.FC = () => {
    return (
        <View style={styles.profileContainer}>
            <SkeletonLoader width={80} height={80} borderRadius={40} />
            <View style={styles.profileInfoContainer}>
                <SkeletonLoader width={150} height={20} style={styles.spacer} />
                <SkeletonLoader width={100} height={16} style={styles.spacer} />
                <SkeletonLoader width={200} height={16} style={styles.spacer} />
            </View>
        </View>
    );
};

/**
 * CardSkeleton - Shows a skeleton for post cards
 */
export const CardSkeleton: React.FC = () => {
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <SkeletonLoader width={40} height={40} borderRadius={20} />
                <View style={styles.cardHeaderText}>
                    <SkeletonLoader width={120} height={16} style={styles.spacer} />
                    <SkeletonLoader width={80} height={12} style={styles.spacer} />
                </View>
            </View>
            <SkeletonLoader width="100%" height={300} />
            <View style={styles.cardActions}>
                <SkeletonLoader width={100} height={20} style={styles.spacer} />
            </View>
        </View>
    );
};

/**
 * GridSkeleton - Shows a skeleton for image grid
 */
export const GridSkeleton: React.FC<{ columns?: number; items?: number }> = ({
    columns = 2,
    items = 6,
}) => {
    const rows = Math.ceil(items / columns);
    const itemWidth = `${100 / columns}%`;

    return (
        <View style={styles.gridContainer}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                    {Array.from({ length: columns }).map((_, colIndex) => {
                        const itemIndex = rowIndex * columns + colIndex;
                        if (itemIndex < items) {
                            return (
                                <SkeletonLoader
                                    key={`item-${itemIndex}`}
                                    width={itemWidth}
                                    height={150}
                                    style={styles.gridItem}
                                />
                            );
                        }
                        return null;
                    })}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: theme.colors.placeholder,
    },
    spacer: {
        marginVertical: 4,
    },
    profileContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    profileInfoContainer: {
        marginLeft: 16,
        flex: 1,
    },
    cardContainer: {
        marginBottom: 16,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    cardHeaderText: {
        marginLeft: 12,
        flex: 1,
    },
    cardActions: {
        padding: 12,
    },
    gridContainer: {
        width: '100%',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridItem: {
        margin: 1,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.placeholder,
        marginRight: 16,
    },
    profileInfo: {
        flex: 1,
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        padding: 16,
    },
});

export default SkeletonLoader; 