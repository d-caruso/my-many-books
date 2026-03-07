// @ts-check
import tseslint from 'typescript-eslint';
import { sharedRules } from '../../eslint.config.js';

export default tseslint.config(
  ...sharedRules,
  {
    files: ['**/*.{js,ts}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
    },
  },
  {
    ignores: ['dist/**', '.serverless/**', '**/tests/**/*', '**/scripts/**/*'],
  },
);
