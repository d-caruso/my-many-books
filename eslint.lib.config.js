// @ts-check
// Shared helper for per-lib eslint configs.
// Each lib's eslint.config.mjs calls createLibConfig(import.meta.dirname).
import path from 'path';
import { existsSync } from 'fs';
import tseslint from 'typescript-eslint';
import { sharedRules } from './eslint.config.js';

/**
 * @param {string} libDir - absolute path to the lib directory (pass import.meta.dirname)
 * @param {string} [tsconfig] - path to tsconfig relative to libDir
 */
export function createLibConfig(libDir, tsconfig = './tsconfig.lib.json') {
  const relativeLibDir = path.relative(process.cwd(), libDir);
  const globRoot = relativeLibDir === '' ? '.' : relativeLibDir;
  const tsconfigSpecPath = path.join(libDir, 'tsconfig.spec.json');
  const project = existsSync(tsconfigSpecPath)
    ? [tsconfig, './tsconfig.spec.json']
    : tsconfig;

  return tseslint.config(
    ...sharedRules,
    {
      files: [`${globRoot}/**/*.{ts,tsx}`],
      extends: [...tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: {
          project,
          tsconfigRootDir: libDir,
        },
      },
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-call': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unsafe-return': 'error',
      },
    },
    {
      ignores: [
        `${globRoot}/dist/**`,
        `${globRoot}/node_modules/**`,
        `${globRoot}/jest.config.ts`,
        `${globRoot}/**/*.test.ts`,
        `${globRoot}/**/*.spec.ts`,
        `${globRoot}/**/__tests__/**`,
        `${globRoot}/**/__mocks__/**`,
      ],
    },
  );
}
