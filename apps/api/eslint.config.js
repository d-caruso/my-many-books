// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules (with type checking)
  ...tseslint.configs.recommendedTypeChecked,

  // Project-specific configuration
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

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