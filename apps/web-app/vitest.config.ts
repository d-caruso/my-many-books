import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import MinimalReporter from './vitest.minimal.reporter'

const useMinimal = process.env.VITEST_USE_MINIMAL === '1'

export default defineConfig({
  plugins: [react()],
  test: {
    reporters: useMinimal ? [new MinimalReporter()] : 'default',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts', './src/jest.setup.ts'],
    css: true,
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000',
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
    alias: {
      '@my-many-books/shared-types': path.resolve(__dirname, '../../libs/shared-types/src'),
      '@my-many-books/shared-api': path.resolve(__dirname, '../../libs/shared-api/src'),
      '@my-many-books/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src'),
      '@my-many-books/ui-components': path.resolve(__dirname, '../../libs/ui-components/src'),
      '@my-many-books/shared-hooks': path.resolve(__dirname, '../../libs/shared-hooks/src'),
      '@my-many-books/shared-business': path.resolve(__dirname, '../../libs/shared-business/src'),
      '@my-many-books/shared-design': path.resolve(__dirname, '../../libs/shared-design/src'),
      '@my-many-books/shared-navigation': path.resolve(__dirname, '../../libs/shared-navigation/src'),
      '@my-many-books/shared-forms': path.resolve(__dirname, '../../libs/shared-forms/src'),
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
});
