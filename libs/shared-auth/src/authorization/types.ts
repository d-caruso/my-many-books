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
 * Subject type for CASL - can be a string or an object with resource type
 */
export type Subject = Resource | { __typename: Resource; [key: string]: any };
