// ================================================================
// libs/shared-auth/src/authorization/types.ts
// Authorization Action and Resource Types
// ================================================================

import type { ForcedSubject } from '@casl/ability';

/**
 * Core authorization actions following CRUD pattern
 */
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',  // Admin: all permissions
  ARCHIVE: 'archive',
} as const;

export type Action = typeof ACTIONS[keyof typeof ACTIONS];

/**
 * Application resources that can be protected
 */
export const RESOURCES = {
  BOOK: 'Book',
  AUTHOR: 'Author',
  CATEGORY: 'Category',
  USER: 'User',
  SETTINGS: 'Settings',
  ALL: 'all',  // Special resource for admin "manage all"
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];

/**
 * Subject types with their fields for CASL type inference.
 *
 * We use CASL's `ForcedSubject` typing so callers can safely use
 * `subject(RESOURCES.BOOK, {...})` in checks.
 */
export type Book = ForcedSubject<typeof RESOURCES.BOOK> & { userId: number };
export type Author = ForcedSubject<typeof RESOURCES.AUTHOR> & { userId: number };
export type Category = ForcedSubject<typeof RESOURCES.CATEGORY> & { userId: number };
export type User = ForcedSubject<typeof RESOURCES.USER> & { id: number };

/**
 * Subject type for CASL - can be a string or an object with resource type
 */
export type Subject = Resource | Book | Author | Category | User;

/**
 * User roles supported by the system
 */
export type UserRole = 'user' | 'admin';
