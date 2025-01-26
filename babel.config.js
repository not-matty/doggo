module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Standalone entry for reanimated plugin
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './app',
            '@components': './app/components',
            '@features': './app/features',
            '@navigation': './app/navigation',
            '@layouts': './app/layouts',
            '@styles': './app/styles',
            '@assets': './app/assets',
            '@utils': './app/utils', // Add this line for utils alias
          },
        },
      ],
    ],
  };
};
