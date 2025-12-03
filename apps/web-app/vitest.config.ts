import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.base';
import path from 'path';

const cssAlias = [
  {
    find: /@mui\/x-data-grid\/esm\/index\.css$/,
    replacement: path.resolve(__dirname, './src/styles/cssMock.ts'),
  },
  {
    find: /@mui\/x-data-grid\/styles\/index\.css$/,
    replacement: path.resolve(__dirname, './src/styles/cssMock.ts'),
  },
  {
    find: /@mui\/x-data-grid\/index\.css$/,
    replacement: path.resolve(__dirname, './src/styles/cssMock.ts'),
  },
];

export default mergeConfig(baseConfig, {
  resolve: {
    alias: cssAlias,
  },
});
