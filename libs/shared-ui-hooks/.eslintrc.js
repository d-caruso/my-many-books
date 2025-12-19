const path = require('path');

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [path.join(__dirname, 'tsconfig.lib.json'), path.join(__dirname, 'tsconfig.spec.json')],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
  env: {
    browser: true,
  },
  rules: {
    'prettier/prettier': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
};
