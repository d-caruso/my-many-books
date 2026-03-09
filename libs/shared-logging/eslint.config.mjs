// @ts-check
import path from 'path';
import { createLibConfig } from '../../eslint.lib.config.js';

const relativeLibDir = path.relative(process.cwd(), import.meta.dirname);
const globRoot = relativeLibDir === '' ? '.' : relativeLibDir;

export default [
  ...createLibConfig(import.meta.dirname),
  {
    files: [`${globRoot}/**/*.{ts,tsx}`],
    rules: {
      'no-console': 'off',
    },
  },
];
