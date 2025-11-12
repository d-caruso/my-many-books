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
          // React core (must stay together)
          'vendor-react': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Material UI core (without icons)
          'vendor-mui-core': [
            '@mui/material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // MUI icons - removed from manual chunks to bundle with components that use them
          // AWS Amplify - removed from manual chunks to defer loading until auth is needed
          // DataGrid - removed from manual chunks to allow lazy loading with admin pages
          // Internationalization (100-150KB)
          'vendor-i18n': [
            'i18next',
            'react-i18next',
            'i18next-browser-languagedetector',
            'i18next-http-backend'
          ],
          // Barcode scanner - removed to enable dynamic loading
          // Will be loaded on-demand when scanner is accessed
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