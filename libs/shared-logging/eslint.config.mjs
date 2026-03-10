// @ts-check
import path from 'path';
import { cwd } from 'node:process';
import { createLibConfig } from '../../eslint.lib.config.js';

const relativeLibDir = path.relative(cwd(), import.meta.dirname);
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
