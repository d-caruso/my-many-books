import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.base';

export default mergeConfig(baseConfig, {
  test: {
    include: ['src/__tests__/components/**/*.{test,spec}.{ts,tsx,js,jsx}'],
  },
});
