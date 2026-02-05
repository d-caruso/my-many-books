// ================================================================
// src/services/authService.ts
// Auth service instance for mobile app
// ================================================================

import { AuthService, MobileStorageAdapter } from '@my-many-books/shared-auth';
import { API_BASE_URL } from '../config/api';

export const authService = new AuthService({
  storage: new MobileStorageAdapter(),
  apiUrl: API_BASE_URL,
});
