import React, { useState } from 'react';
import { StyleSheet, View, Image, ImageProps, ImageURISource } from 'react-native';
import { theme } from '../../constants/theme';

// Define our props interface based on Image props
interface CachedImageProps extends ImageProps {
    fallbackSource?: ImageURISource | number;
    showPlaceholder?: boolean;
}

/**
 * CachedImage - A component for displaying images with loading states and fallbacks
 * Previously used FastImage but now uses regular Image for better stability
 */
const CachedImage: React.FC<CachedImageProps> = ({
    source,
    fallbackSource,
    style,
    showPlaceholder = true,
    resizeMode = 'cover',
    ...rest
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Process the source to handle string URIs
    const getSource = (): ImageURISource => {
        if (!source) return { uri: '' };

        if (typeof source === 'string') {
            return { uri: source };
        }

        return source as ImageURISource;
    };

    // Error handling function
    const handleError = () => {
        console.log('Image loading error, using fallback if available');
        setHasError(true);
        setIsLoading(false);
    };

    return (
        <View style={[styles.container, style]}>
            {showPlaceholder && isLoading && (
                <View style={[styles.placeholder, StyleSheet.absoluteFill]} />
            )}

            <Image
                source={getSource()}
                style={[styles.image, style]}
                resizeMode={resizeMode}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)}
                onError={handleError}
                {...rest}
            />

            {hasError && fallbackSource && (
                <Image
                    source={fallbackSource}
                    style={[styles.image, style]}
                    resizeMode={resizeMode}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        backgroundColor: theme.colors.placeholder,
    },
});

export default CachedImage; 