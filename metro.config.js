const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { resolver } = config;

  config.resolver = {
    ...resolver,
    sourceExts: [...resolver.sourceExts, 'cjs'],
  };

  return config;
})();
