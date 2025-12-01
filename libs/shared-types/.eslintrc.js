const path = require('path');

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: [
      path.join(__dirname, 'tsconfig.lib.json'),
      path.join(__dirname, 'tsconfig.spec.json'),
    ],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['dist/', 'node_modules/', '*.js', 'jest.config.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
