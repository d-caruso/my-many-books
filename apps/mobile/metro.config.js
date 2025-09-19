const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for shared libraries in libs folder
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

config.watchFolders = [
  path.resolve(monorepoRoot, 'libs'),
  path.resolve(monorepoRoot, 'apps/mobile')
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.alias = {
  '@my-many-books/shared-api': path.resolve(monorepoRoot, 'libs/shared-api/src'),
  '@my-many-books/shared-types': path.resolve(monorepoRoot, 'libs/shared-types/src'),
  '@my-many-books/shared-utils': path.resolve(monorepoRoot, 'libs/shared-utils/src'),
  '@my-many-books/shared-business': path.resolve(monorepoRoot, 'libs/shared-business/src'),
};

module.exports = config;