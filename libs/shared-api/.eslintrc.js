const path = require('path');

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.join(__dirname, 'tsconfig.lib.json'),
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['dist/', 'node_modules/', '*.js', 'src/__mocks__/**/*'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
