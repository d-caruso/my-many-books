// ================================================================
// index.ts
// Main exports for @my-many-books/shared-auth library
// ================================================================

// Core service
export { AuthService } from './AuthService';

// Storage adapters
export { WebStorageAdapter } from './adapters/WebStorageAdapter';
export { MobileStorageAdapter } from './adapters/MobileStorageAdapter';

// React components
export { AuthProvider, useAuth } from './react/AuthProvider';

// Types
export type {
  User,
  AuthTokens,
  StorageAdapter,
  AuthServiceConfig,
  LoginResponse,
  RefreshResponse,
  RegisterResponse,
  AuthState,
} from './types';
