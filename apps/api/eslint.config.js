// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Project-specific configuration
  {
    files: ['**/*.{js,ts}'],
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',

      // Prevent console usage - use structured logging (Pino) instead
      'no-console': 'error',
    },
  },

  // Prettier config (disables conflicting rules)
  eslintConfigPrettier,

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.serverless/**',
      'coverage/**',
      '*.js',
      'scripts/**/*',
      'tests/**/*',
    ],
  }
);