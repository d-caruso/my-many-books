export const ENTITY_MANAGE_ERROR_CODES = Object.freeze({
  VALIDATION: 'VALIDATION',
  HAS_BOOKS: 'HAS_BOOKS',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  UNKNOWN: 'UNKNOWN',
} as const);

export type EntityManageErrorCode =
  typeof ENTITY_MANAGE_ERROR_CODES[keyof typeof ENTITY_MANAGE_ERROR_CODES];

export const AUTHOR_DELETE_CONFLICT_REASONS = Object.freeze({
  HAS_BOOKS: 'AUTHOR_HAS_BOOKS',
} as const);

export type AuthorDeleteConflictReason =
  typeof AUTHOR_DELETE_CONFLICT_REASONS[keyof typeof AUTHOR_DELETE_CONFLICT_REASONS];

export const CATEGORY_DELETE_CONFLICT_REASONS = Object.freeze({
  HAS_BOOKS: 'CATEGORY_HAS_BOOKS',
} as const);

export type CategoryDeleteConflictReason =
  typeof CATEGORY_DELETE_CONFLICT_REASONS[keyof typeof CATEGORY_DELETE_CONFLICT_REASONS];

export interface EntityManageOperationError {
  code: EntityManageErrorCode;
  i18nKey: string;
  message?: string;
  status?: number;
  backendError?: string;
}

export type EntityManageOperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: EntityManageOperationError };
