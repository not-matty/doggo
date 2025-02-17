import * as ImageManipulator from 'expo-image-manipulator';

export const optimizeImage = async (
    uri: string,
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        isProfilePicture?: boolean;
    } = {}
) => {
    const {
        maxWidth = 1080,
        maxHeight = 1080,
        quality = 0.7,
        isProfilePicture = false,
    } = options;

    try {
        // First, get the image dimensions
        const firstResult = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { compress: 1 }
        );

        // Calculate scaling factor to maintain aspect ratio
        let width = firstResult.width;
        let height = firstResult.height;
        let scale = 1;

        if (isProfilePicture) {
            // For profile pictures, we want a square image
            const size = Math.min(width, height, 500); // Max 500x500 for profile pics
            width = size;
            height = size;
        } else {
            // Calculate scale based on the larger dimension
            const maxDimension = Math.max(width, height);
            if (maxDimension > maxWidth) {
                scale = maxWidth / maxDimension;
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
        }

        // Perform the actual optimization
        const actions: ImageManipulator.Action[] = [];

        if (isProfilePicture) {
            // Crop to square for profile pictures
            const size = Math.min(firstResult.width, firstResult.height);
            actions.push({
                crop: {
                    originX: (firstResult.width - size) / 2,
                    originY: (firstResult.height - size) / 2,
                    width: size,
                    height: size,
                },
            });
            actions.push({ resize: { width, height } });
        } else if (scale !== 1) {
            actions.push({ resize: { width, height } });
        }

        const result = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            {
                compress: quality,
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );

        return result;
    } catch (error) {
        console.error('Image optimization error:', error);
        throw error;
    }
}; 