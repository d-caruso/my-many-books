import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.base';

export default mergeConfig(baseConfig, {
  test: {
    include: [
      'src/__tests__/integration/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'src/__tests__/accessibility/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
  },
});
