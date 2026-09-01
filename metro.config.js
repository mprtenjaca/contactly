const { getDefaultConfig } = require('expo/metro-config');

// Expo's default Metro config already handles asset hashing, source/asset
// extensions and the SVG/CJS resolvers this project relies on. Keep it as-is
// and add overrides here only when something genuinely needs them.
const config = getDefaultConfig(__dirname);

module.exports = config;
