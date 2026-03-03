// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // React plugin configuration
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React recommended rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript adjustments
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // React adjustments
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    },
  },

  // Cypress support files use declaration merging on Cypress namespace.
  {
    files: ['**/cypress/support/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },

  // Cypress webpack config runs in Node/CommonJS context.
  {
    files: ['**/cypress/webpack.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Service worker has a dedicated worker global scope.
  {
    files: ['**/public/sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },

  // Seed scripts run in Node/CommonJS context.
  {
    files: ['**/seed-*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Test and mock files run in test/runtime contexts and often use mock factories.
  {
    files: [
      '**/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/src/**/__mocks__/**/*.{js,jsx,ts,tsx}',
      '**/src/jest.setup.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'react/display-name': 'off',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      '**/*.config.js',
      '**/*.config.ts',
      '**/.eslintrc.cjs',
      'vite.config.ts',
      'vitest.config.ts',
      'vitest.*.ts',
      'src/**/__tests__/**',
      'src/**/__mocks__/**',
      'src/setupTests.ts',
      'src/jest.setup.ts',
    ],
  }
);
