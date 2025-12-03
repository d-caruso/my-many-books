module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'tmp/',
    'coverage/',
    'build/',
    '**/build/**',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
  overrides: [
    {
      files: ['apps/web-app/cypress/**/*.{js,ts,jsx,tsx}'],
      env: {
        browser: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
    {
      files: ['apps/web-app/public/sw.js'],
      env: {
        browser: false,
        worker: true,
        serviceworker: true,
      },
      globals: {
        self: 'readonly',
      },
    },
  ],
};
