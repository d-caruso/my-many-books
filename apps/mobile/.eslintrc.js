module.exports = {
  root: true,
  extends: ['expo', '@react-native'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // React specific rules
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General rules
    'no-console': 'warn',
    'prefer-const': 'error',
    'import/no-unresolved': ['error', { ignore: ['^\\./testUtils$', '^\\.//testUtils$'] }],
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  env: {
    'react-native/react-native': true,
    jest: true,
  },
  overrides: [
    {
      files: ['__tests__/**/*', '__mocks__/**/*', 'src/types/**/*'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-unresolved': 'off',
        'no-var': 'off',
      },
    },
  ],
};