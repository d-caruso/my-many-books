// ================================================================
// src/services/authService.ts
// Auth service instance for mobile app
// ================================================================

import { AuthService, MobileStorageAdapter } from '@my-many-books/shared-auth';
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3001/api/v1';

export const authService = new AuthService({
  storage: new MobileStorageAdapter(),
  apiUrl,
  onAuthStateChange: (user) => {
    console.log('Auth state changed:', user);
  },
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed, expires at:', new Date(tokens.expiresAt));
  },
});
