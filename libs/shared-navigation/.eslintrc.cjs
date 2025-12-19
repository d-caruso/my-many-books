module.exports = {
  extends: ['../../.eslintrc.cjs'],
  parserOptions: {
    project: 'tsconfig.lib.json',
    tsconfigRootDir: __dirname,
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**/*.{ts,tsx}'],
      parserOptions: {
        project: null,
      },
    },
  ],
};

