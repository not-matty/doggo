/**
 * Image utility functions for optimizing image loading and caching
 */

/**
 * Generates image URLs for different sizes to support responsive loading
 * @param originalUrl The original image URL
 * @param sizes Object with size names as keys and width/height as values
 */
export const getResponsiveImageUrls = (
    originalUrl: string,
    sizes: { [key: string]: { width: number; height?: number } } = {
        thumbnail: { width: 100 },
        small: { width: 300 },
        medium: { width: 600 },
        large: { width: 1200 },
    }
) => {
    if (!originalUrl) return null;

    // Check if URL is from Supabase Storage
    const isSupabaseStorage = originalUrl.includes('supabase.co/storage/v1/object/public');

    if (isSupabaseStorage) {
        // For Supabase Storage, we can append transform parameters
        const urls: { [key: string]: string } = {};

        Object.entries(sizes).forEach(([size, dimensions]) => {
            const { width, height } = dimensions;
            const heightParam = height ? `&height=${height}` : '';

            // Add resize parameters for Supabase Storage
            urls[size] = `${originalUrl}?width=${width}${heightParam}&resize=contain`;
        });

        // Add original URL
        urls.original = originalUrl;

        return urls;
    }

    // For non-Supabase URLs, we can't transform them, so return original
    return { original: originalUrl };
};

/**
 * Prefetches critical images for faster loading
 * @param urls Array of image URLs to prefetch
 */
export const prefetchImages = (urls: string[]) => {
    try {
        // Since we're not using react-native-fast-image yet, this is a placeholder
        // This would normally use FastImage.preload() if FastImage were installed
        console.log('Would prefetch images:', urls);
        return Promise.resolve();
    } catch (error) {
        console.error('Error prefetching images:', error);
        return Promise.reject(error);
    }
};

/**
 * Converts base64 data to a File object (for web) or uri (for native)
 * @param base64Data Base64 data string
 * @param filename Desired filename
 * @param mimeType MIME type of the image
 */
export const base64ToFile = (
    base64Data: string,
    filename: string = 'image.jpg',
    mimeType: string = 'image/jpeg'
) => {
    try {
        // Check if we're in a web environment
        if (typeof window !== 'undefined' && window.File && window.Blob) {
            // Convert base64 to Blob
            const byteString = atob(base64Data.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);

            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            const blob = new Blob([ab], { type: mimeType });
            return new File([blob], filename, { type: mimeType });
        } else {
            // In React Native, return the base64 as a URI
            return { uri: base64Data };
        }
    } catch (error) {
        console.error('Error converting base64 to file:', error);
        return null;
    }
};

/**
 * Generates a smaller blurry placeholder for progressive loading
 * @param imageUrl URL of the original image
 */
export const getBlurHash = (imageUrl: string) => {
    // This would normally calculate a blurhash, but that requires a library
    // For now, we'll return a placeholder enhancement that can be added later
    if (!imageUrl) return null;

    // Check if URL is from Supabase Storage
    const isSupabaseStorage = imageUrl.includes('supabase.co/storage/v1/object/public');

    if (isSupabaseStorage) {
        // For Supabase Storage, we can generate a tiny thumbnail for blurhash simulation
        return `${imageUrl}?width=20&height=20&resize=contain&quality=10`;
    }

    return null;
}; 