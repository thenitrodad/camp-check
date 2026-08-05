const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Supabase v2 uses package.exports which some Metro versions don't handle.
// Disabling unstable_enablePackageExports forces classic main/module resolution.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
