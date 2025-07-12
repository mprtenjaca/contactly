const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add minimal customizations
defaultConfig.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];
defaultConfig.resolver.assetExts = [
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'svg', 'ttc'
];

// Add custom transformer settings
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

module.exports = defaultConfig; 