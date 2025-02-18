#!/bin/bash

# Check if a URL is provided
if [ -z "$1" ]; then
    echo "Please provide the EAS build URL as an argument"
    echo "Usage: ./install-simulator-build.sh <EAS_BUILD_URL>"
    exit 1
fi

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Download the build
echo "Downloading build from $1..."
curl -L "$1" -o "$TEMP_DIR/build.tar.gz"

# Extract the build
echo "Extracting build..."
tar -xzf "$TEMP_DIR/build.tar.gz" -C "$TEMP_DIR"

# Find the .app file
APP_FILE=$(find "$TEMP_DIR" -name "*.app" -type d)

if [ -z "$APP_FILE" ]; then
    echo "No .app file found in the build"
    exit 1
fi

echo "Found app file: $APP_FILE"

# Install on simulator
echo "Installing on simulator..."
xcrun simctl install booted "$APP_FILE"

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo "Installation complete!" 