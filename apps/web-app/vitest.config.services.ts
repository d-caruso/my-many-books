import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.base';

export default mergeConfig(baseConfig, {
  test: {
    include: [
      'src/__tests__/services/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'src/__tests__/types/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'src/__tests__/utils/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
  },
});
