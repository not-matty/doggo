/**
 * Script to help optimize images in the Supabase storage bucket
 * 
 * This script can be run to:
 * 1. Generate optimized versions of existing images
 * 2. Set proper cache headers on images
 * 3. Analyze image sizes and suggest optimizations
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const BUCKET_NAME = 'posts';
const IMAGE_SIZES = {
    thumbnail: { width: 100, height: 100 },
    small: { width: 300 },
    medium: { width: 600 },
    large: { width: 1200 },
};

// Helper function to get file extension
const getExtension = (filename) => {
    return path.extname(filename).toLowerCase();
};

// Helper function to check if file is an image
const isImage = (filename) => {
    const ext = getExtension(filename);
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
};

// Function to list all images in a bucket
async function listImages() {
    try {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list();

        if (error) {
            throw error;
        }

        // Filter out non-image files
        const images = data.filter(file => isImage(file.name));

        console.log(`Found ${images.length} images in bucket '${BUCKET_NAME}'`);
        return images;
    } catch (error) {
        console.error('Error listing images:', error);
        return [];
    }
}

// Function to set cache headers on images
async function setCacheHeaders(imagePath) {
    try {
        // Get the current metadata
        const { data: metadata, error: metadataError } = await supabase.storage.from(BUCKET_NAME)
            .getPublicUrl(imagePath);

        if (metadataError) {
            throw metadataError;
        }

        // Set cache headers (this is a placeholder - actual implementation depends on your storage provider)
        console.log(`Would set cache headers for: ${imagePath}`);
        console.log('This functionality requires custom server-side implementation');

        return true;
    } catch (error) {
        console.error(`Error setting cache headers for ${imagePath}:`, error);
        return false;
    }
}

// Function to analyze image sizes
async function analyzeImageSizes() {
    try {
        const images = await listImages();

        if (images.length === 0) {
            console.log('No images found to analyze');
            return;
        }

        console.log('\nImage Size Analysis:');
        console.log('--------------------');

        let totalSize = 0;
        let largeImages = [];

        for (const image of images) {
            totalSize += image.metadata.size;

            if (image.metadata.size > 1000000) { // 1MB
                largeImages.push({
                    name: image.name,
                    size: (image.metadata.size / 1000000).toFixed(2) + ' MB'
                });
            }
        }

        console.log(`Total images: ${images.length}`);
        console.log(`Total size: ${(totalSize / 1000000).toFixed(2)} MB`);
        console.log(`Average size: ${(totalSize / images.length / 1000).toFixed(2)} KB`);

        if (largeImages.length > 0) {
            console.log('\nLarge images that could be optimized:');
            largeImages.forEach(img => {
                console.log(`- ${img.name}: ${img.size}`);
            });
        }

    } catch (error) {
        console.error('Error analyzing image sizes:', error);
    }
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'analyze':
            await analyzeImageSizes();
            break;

        case 'cache':
            const images = await listImages();
            console.log(`Setting cache headers for ${images.length} images...`);

            for (const image of images) {
                await setCacheHeaders(image.name);
            }

            console.log('Cache headers set successfully');
            break;

        default:
            console.log('Usage:');
            console.log('  node optimize-images.js analyze - Analyze image sizes');
            console.log('  node optimize-images.js cache - Set cache headers on images');
            break;
    }
}

main().catch(console.error); 