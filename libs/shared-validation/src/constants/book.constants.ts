import { BOOK_STATUSES } from '@my-many-books/shared-types';

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
 * Book validation error messages
 */
export const BOOK_ERROR_MESSAGES = Object.freeze({
  TITLE_REQUIRED: 'Title is required',
  TITLE_TOO_SHORT: `Title must be at least ${BOOK_CONSTRAINTS.TITLE.MIN_LENGTH} character`,
  TITLE_TOO_LONG: `Title must be at most ${BOOK_CONSTRAINTS.TITLE.MAX_LENGTH} characters`,
  NOTES_TOO_LONG: `Notes must be at most ${BOOK_CONSTRAINTS.NOTES.MAX_LENGTH} characters`,
  INVALID_STATUS: `Status must be one of: ${BOOK_STATUSES.join(', ')}`,
  EDITION_NUMBER_INVALID: 'Edition number must be a positive integer',
  EDITION_DATE_INVALID: 'Edition date must be a valid date (YYYY, YYYY-MM, or YYYY-MM-DD)',
} as const);

/**
 * Edition date format pattern.
 * Accepts: "YYYY", "YYYY-MM", or "YYYY-MM-DD"
 */
export const EDITION_DATE_PATTERN = /^\d{4}(-\d{2}(-\d{2})?)?$/;
