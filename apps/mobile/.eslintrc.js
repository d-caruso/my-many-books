module.exports = {
  root: true,
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  extends: ['expo'], // expo config already includes React Native and react-hooks support
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // React specific rules
    'react/prop-types': 'off',
    // react-hooks rules are already included in both 'expo' and '@react-native' configs

    // General rules
    'no-console': 'off',
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
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
      },
    },
  ],
};