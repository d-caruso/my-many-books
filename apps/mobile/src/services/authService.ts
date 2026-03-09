// ================================================================
// src/services/authService.ts
// Auth service instance for mobile app
// ================================================================

import { AuthService } from '@my-many-books/shared-auth';
import { MobileStorageAdapter } from './MobileStorageAdapter';
import { API_BASE_URL } from '../config/api';

export const authService = new AuthService({
  storage: new MobileStorageAdapter(),
  apiUrl: API_BASE_URL,
});
