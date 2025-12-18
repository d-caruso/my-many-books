import { mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config.base';

export default mergeConfig(baseConfig, {
  test: {
    include: ['src/__tests__/pages/**/*.{test,spec}.{ts,tsx,js,jsx}'],
  },
});
