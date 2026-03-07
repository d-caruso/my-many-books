// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

// Shared base rules imported by per-project eslint configs.
// Does NOT include projectService/type-checking (each project adds its own parserOptions)
// Does NOT include ignores (each project adds its own)
export const sharedRules = tseslint.config(
  eslint.configs.recommended,

  // TypeScript rules — parser + base rules (no type-checking)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      'no-console': 'error',
    },
  },

  // React rules — web-app, mobile, and libs with TSX
  {
    files: ['apps/web-app/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}', 'libs/**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },

  // Prettier (disables conflicting formatting rules)
  eslintConfigPrettier,

  // Cypress support files
  {
    files: ['apps/web-app/cypress/support/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  {
    files: ['**/cypress/webpack.config.js', '**/seed-*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Service worker
  {
    files: ['**/public/sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
);

// Root-level ESLint config = shared rules + workspace-wide ignores
export default tseslint.config(
  ...sharedRules,
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/build/**',
      '**/.serverless/**',
      'tmp/**',
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.ts',
      '**/scripts/**/*',
      'apps/api/tests/**/*',
      'libs/shared-ui-hooks/src/examples/**',
    ],
  },
);
