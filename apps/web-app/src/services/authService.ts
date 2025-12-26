// ================================================================
// services/authService.ts
// Auth service instance for web app
// ================================================================

import {
  AuthService,
  WebStorageAdapter,
  LocalStorageAdapter,
} from '@my-many-books/shared-auth';
import { env } from '../config/env';

// Use LocalStorageAdapter when explicitly requested (E2E tests), WebStorageAdapter for production
// LocalStorageAdapter persists auth across page reloads (needed for E2E tests)
// WebStorageAdapter is in-memory for XSS security (production default)
const useLocalStorage = typeof window !== 'undefined' && !!(window as any).useLocalStorage;
const storage = useLocalStorage ? new LocalStorageAdapter() : new WebStorageAdapter();

// Create singleton instance
export const authService = new AuthService({
  storage,
  apiUrl: env.API_BASE_URL || 'http://localhost:3001/api/v1',
});
