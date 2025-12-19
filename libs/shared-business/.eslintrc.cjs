module.exports = {
  extends: ['../../.eslintrc.cjs'],
  parserOptions: {
    project: 'tsconfig.lib.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
      parserOptions: {
        project: null,
      },
    },
  ],
};
