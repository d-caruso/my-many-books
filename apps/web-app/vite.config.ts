import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    // Define both process.env and import.meta.env for compatibility
    'process.env.NODE_ENV': '"test"',
    'process.env.REACT_APP_COGNITO_USER_POOL_ID': '""',
    'process.env.REACT_APP_COGNITO_USER_POOL_CLIENT_ID': '""',
    'process.env.REACT_APP_COGNITO_IDENTITY_POOL_ID': '""',
    'process.env.REACT_APP_API_URL': '"http://localhost:3001"',
  },
  envPrefix: ['VITE_', 'REACT_APP_'],
  envDir: '.',
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
  },
  };
});