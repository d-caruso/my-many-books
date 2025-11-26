// ================================================================
// libs/shared-auth/src/authorization/constants.ts
// Authorization Constants - Actions and Resources
// ================================================================

import { ACTIONS, RESOURCES } from './types';

/**
 * Export constants for use throughout the application
 *
 * Usage:
 * ```typescript
 * import { ACTIONS, RESOURCES } from '@shared-auth/authorization';
 *
 * requirePermission(ACTIONS.DELETE, RESOURCES.BOOK)
 * ```
 */
export { ACTIONS, RESOURCES };

/**
 * User roles supported by the system
 */
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
