const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.config.ts',
      '*.config.js',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },
  ...compat.config({
    extends: ['../../.eslintrc.cjs'],
    parserOptions: {
      project: 'tsconfig.lib.json',
      tsconfigRootDir: __dirname,
    },
  }),
];
