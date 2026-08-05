const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package.exports to avoid ESM resolution issues with Supabase
config.resolver.unstable_enablePackageExports = false;

// Force Metro to transform @supabase packages through Babel
// (some Supabase sub-packages ship ES module syntax that Metro can't parse natively)
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(' +
    [
      'react-native',
      '@react-native',
      '@react-native-community',
      'expo',
      '@expo',
      'expo-router',
      '@supabase',
      'react-native-url-polyfill',
      'react-native-reanimated',
      'react-native-gesture-handler',
      'react-native-screens',
      'react-native-safe-area-context',
    ].join('|') +
  ')/)',
];

module.exports = config;
