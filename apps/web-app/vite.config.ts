import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  envDir: __dirname,
  publicDir: 'public',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    alias: {
      '@my-many-books/shared-types': path.resolve(__dirname, '../../libs/shared-types/src/index.ts'),
      '@my-many-books/shared-api': path.resolve(__dirname, '../../libs/shared-api/src'),
      '@my-many-books/shared-utils': path.resolve(__dirname, '../../libs/shared-utils/src'),
      '@my-many-books/shared-auth': path.resolve(__dirname, '../../libs/shared-auth/src'),
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
  optimizeDeps: {
    include: ['buffer', 'process', 'stream-browserify', 'util'],
    exclude: ['react-native', 'expo-secure-store'],
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
          // Material UI - separate chunk for caching, loads with ThemedApp (deferred)
          'vendor-mui': [
            '@mui/material',
            '@emotion/react',
            '@emotion/styled'
          ],
          // MUI icons - removed to bundle with pages that use them
          // AWS Amplify - removed to defer loading until auth actions
          // DataGrid - removed to lazy load with admin pages only
          // i18n - removed from preload, loads after first render
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
