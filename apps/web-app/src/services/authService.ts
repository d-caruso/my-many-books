// ================================================================
// services/authService.ts
// Auth service instance for web app
// ================================================================

import { AuthService, WebStorageAdapter } from '@my-many-books/shared-auth';

// Create singleton instance
export const authService = new AuthService({
  storage: new WebStorageAdapter(),
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  onAuthStateChange: (user) => {
    console.log('Auth state changed:', user);
  },
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed, expires at:', new Date(tokens.expiresAt));
  },
});
