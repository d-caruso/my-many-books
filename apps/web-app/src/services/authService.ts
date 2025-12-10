// ================================================================
// services/authService.ts
// Auth service instance for web app
// ================================================================

import { AuthService, WebStorageAdapter } from '@my-many-books/shared-auth';
import { env } from '../config/env';

// Create singleton instance
export const authService = new AuthService({
  storage: new WebStorageAdapter(),
  apiUrl: env.API_BASE_URL || 'http://localhost:3001/api/v1',
});
