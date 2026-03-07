// @ts-check
// Shared helper for per-lib eslint configs.
// Each lib's eslint.config.mjs calls createLibConfig(import.meta.dirname).
import path from 'path';
import tseslint from 'typescript-eslint';
import { sharedRules } from './eslint.config.js';

/**
 * @param {string} libDir - absolute path to the lib directory (pass import.meta.dirname)
 * @param {string} [tsconfig] - path to tsconfig relative to libDir
 */
export function createLibConfig(libDir, tsconfig = './tsconfig.lib.json') {
  const relativeLibDir = path.relative(process.cwd(), libDir);
  return tseslint.config(
    ...sharedRules,
    {
      files: [`${relativeLibDir}/**/*.{ts,tsx}`],
      extends: [...tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: {
          project: tsconfig,
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
        `${relativeLibDir}/dist/**`,
        `${relativeLibDir}/node_modules/**`,
        `${relativeLibDir}/**/*.test.ts`,
        `${relativeLibDir}/**/*.spec.ts`,
        `${relativeLibDir}/**/__tests__/**`,
      ],
    },
  );
}
