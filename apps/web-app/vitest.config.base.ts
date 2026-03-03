import type { UserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import MinimalReporter from './vitest.minimal.reporter';

const useMinimal = process.env.VITEST_USE_MINIMAL === '1';

const workerPool = process.env.VITEST_POOL === 'forks' ? 'forks' : 'threads';

const baseVitestConfig: UserConfig = {
  plugins: [react()],
  test: {
    reporters: useMinimal ? [new MinimalReporter()] : 'default',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts', './src/jest.setup.ts'],
    css: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: workerPool,
    transformMode: {
      web: [/\.[jt]sx?$/, /\.css$/],
    },
    env: {
      VITE_API_ORIGIN: 'http://localhost:3000',
      VITE_API_PREFIX: '/api',
      VITE_API_VERSION: 'v1',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/jest.setup.ts',
        'src/**/*.d.ts',
        'src/index.tsx',
        'src/reportWebVitals.ts',
        'src/sw.ts',
        'src/react-app-env.d.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    alias: {
      '@my-many-books/shared-types': path.resolve(__dirname, '../../libs/shared-types/src/index.ts'),
      '@my-many-books/shared-api': path.resolve(__dirname, '../../libs/shared-api/src'),
      '@my-many-books/shared-auth': path.resolve(__dirname, '../../libs/shared-auth/src/index.ts'),
      '@my-many-books/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src'),
      '@my-many-books/shared-validation': path.resolve(__dirname, '../../libs/shared-validation/src'),
      '@my-many-books/ui-components': path.resolve(__dirname, '../../libs/ui-components/src'),
      '@my-many-books/shared-ui-hooks': path.resolve(__dirname, '../../libs/shared-ui-hooks/src'),
      '@my-many-books/shared-business': path.resolve(__dirname, '../../libs/shared-business/src'),
      '@my-many-books/shared-design': path.resolve(__dirname, '../../libs/shared-design/src'),
      '@my-many-books/shared-navigation': path.resolve(__dirname, '../../libs/shared-navigation/src'),
      '@my-many-books/shared-forms': path.resolve(__dirname, '../../libs/shared-forms/src'),
      '@my-many-books/shared-i18n/src': path.resolve(__dirname, '../../libs/shared-i18n/src'),
      '@my-many-books/shared-i18n': path.resolve(__dirname, '../../libs/shared-i18n/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util',
    },
  },
  define: {
    global: 'globalThis',
  },
};

export default baseVitestConfig;
