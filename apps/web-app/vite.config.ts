import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
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
  optimizeDeps: {
    include: ['buffer', 'process', 'stream-browserify', 'util'],
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core (300-400KB)
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Material UI (400-500KB)
          'vendor-mui': [
            '@mui/material',
            '@mui/icons-material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // AWS Amplify (300-400KB)
          'vendor-aws': [
            'aws-amplify',
            '@aws-amplify/auth',
            '@aws-amplify/ui-react'
          ],
          // Internationalization (100-150KB)
          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector'
          ],
          // Barcode scanner (200-300KB)
          'vendor-barcode': [
            '@zxing/browser',
            '@zxing/library'
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 3000,
  },
  css: {
    postcss: './postcss.config.js',
  },
})