// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.extraNodeModules = {
  '@components': './app/components',
  '@context': './app/context',
  '@features': './app/features',
  '@navigation': './app/navigation',
  '@styles': './app/styles',
  '@layouts': './app/layouts',
  '@data': './app/data',
  '@assets': './app/assets',
  '@services': './app/services',
};

module.exports = defaultConfig;
