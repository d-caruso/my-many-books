// ================================================================
// index.ts
// Main exports for @my-many-books/shared-auth library
// ================================================================

// Core service
export { AuthService } from './AuthService';
export { AuthApiError } from './AuthApiError';

// Storage adapters
export { WebStorageAdapter } from './adapters/WebStorageAdapter';
export { MobileStorageAdapter } from './adapters/MobileStorageAdapter';
export { LocalStorageAdapter } from './adapters/LocalStorageAdapter';

// React components and hooks
export { AuthProvider, useAuth } from './react/AuthProvider';
export { usePermission, useIsAdmin, useIsOwner } from './react/usePermission';
export {
  PASSWORD_POLICY,
  getRequiredPasswordRuleTypes,
  validatePasswordAgainstPolicy,
  isPasswordCompliant,
  formatLocalizedList,
} from './passwordPolicy';

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
export type {
  PasswordPolicy,
  PasswordRuleType,
  PasswordValidationRule,
  PasswordValidationResult,
} from './passwordPolicy';

// Authorization (CASL)
export {
  createAbilityFor,
  ACTIONS,
  RESOURCES,
  USER_ROLES,
} from './authorization';

export type {
  AppAbility,
  Action,
  Resource,
  Subject,
  UserRole,
} from './authorization';
