/**
 * Book Validation Constants
 *
 * Single source of truth for book field validation rules.
 * Used by both backend (Joi) and frontend (Zod) validation schemas.
 */

/**
 * Book field length constraints
 */
export const BOOK_CONSTRAINTS = Object.freeze({
  TITLE: Object.freeze({
    MIN_LENGTH: 1,
    MAX_LENGTH: 500, // Frontend uses 500, backend validation.ts uses 255
  } as const),
  NOTES: Object.freeze({
    MAX_LENGTH: 2000,
  } as const),
  EDITION_NUMBER: Object.freeze({
    MIN: 1,
  } as const),
} as const);

/**
 * Book status enum values
 */
export const BOOK_STATUS = Object.freeze({
  READING: 'reading',
  PAUSED: 'paused',
  FINISHED: 'finished',
  TO_READ: 'TO_READ', // Frontend default
} as const);

/**
 * Valid book status values (for validation)
 */
export const VALID_BOOK_STATUSES = Object.freeze([
  BOOK_STATUS.READING,
  BOOK_STATUS.PAUSED,
  BOOK_STATUS.FINISHED,
  BOOK_STATUS.TO_READ,
] as const);

/**
 * Book validation error messages
 */
export const BOOK_ERROR_MESSAGES = Object.freeze({
  TITLE_REQUIRED: 'Title is required',
  TITLE_TOO_SHORT: `Title must be at least ${BOOK_CONSTRAINTS.TITLE.MIN_LENGTH} character`,
  TITLE_TOO_LONG: `Title must be at most ${BOOK_CONSTRAINTS.TITLE.MAX_LENGTH} characters`,
  NOTES_TOO_LONG: `Notes must be at most ${BOOK_CONSTRAINTS.NOTES.MAX_LENGTH} characters`,
  INVALID_STATUS: `Status must be one of: ${VALID_BOOK_STATUSES.join(', ')}`,
  EDITION_NUMBER_INVALID: 'Edition number must be a positive integer',
  EDITION_DATE_INVALID: 'Edition date must be a valid date',
} as const);

/**
 * Type exports
 */
export type BookStatus = typeof VALID_BOOK_STATUSES[number];
