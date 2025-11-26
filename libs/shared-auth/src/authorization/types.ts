// ================================================================
// libs/shared-auth/src/authorization/types.ts
// Authorization Action and Resource Types
// ================================================================

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
  ALL: 'all',  // Special resource for admin "manage all"
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];

/**
 * Subject types with their fields for CASL type inference
 */
export interface Book {
  __typename: 'Book';
  userId: number;
}

export interface Author {
  __typename: 'Author';
  userId: number;
}

export interface Category {
  __typename: 'Category';
  userId: number;
}

export interface User {
  __typename: 'User';
  id: number;
}

/**
 * Subject type for CASL - can be a string or an object with resource type
 */
export type Subject = Resource | Book | Author | Category | User;

/**
 * User roles supported by the system
 */
export type UserRole = 'user' | 'admin';
