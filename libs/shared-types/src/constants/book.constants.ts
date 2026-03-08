/**
 * Book status enum values
 */
export const BOOK_STATUS = Object.freeze({
  READING: 'reading',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const);

/**
 * Array of all book status values (derived from BOOK_STATUS)
 * Used for validation schemas
 */
export const BOOK_STATUSES = Object.freeze(
  Object.values(BOOK_STATUS)
);

/**
 * Type exports
 */
export type BookStatus = typeof BOOK_STATUSES[number];
