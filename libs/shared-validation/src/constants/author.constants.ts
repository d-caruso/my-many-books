/**
 * Author Validation Constants
 *
 * Single source of truth for author field validation rules.
 * Used by both backend (Joi) and frontend (Zod) validation schemas.
 */

/**
 * Author field length constraints
 */
export const AUTHOR_CONSTRAINTS = Object.freeze({
  NAME: Object.freeze({
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  } as const),
  SURNAME: Object.freeze({
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  } as const),
  NATIONALITY: Object.freeze({
    MAX_LENGTH: 255,
  } as const),
} as const);

/**
 * Author name pattern
 * Allows letters (including accented), spaces, hyphens, and apostrophes
 */
export const AUTHOR_PATTERNS = Object.freeze({
  NAME: /^[a-zA-ZÀ-ÿ\s'-]+$/,
} as const);

/**
 * Author validation error messages
 */
export const AUTHOR_ERROR_MESSAGES = Object.freeze({
  NAME_REQUIRED: 'Name is required',
  NAME_TOO_SHORT: `Name must be at least ${AUTHOR_CONSTRAINTS.NAME.MIN_LENGTH} character`,
  NAME_TOO_LONG: `Name must be at most ${AUTHOR_CONSTRAINTS.NAME.MAX_LENGTH} characters`,
  NAME_INVALID_CHARS: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  SURNAME_REQUIRED: 'Surname is required',
  SURNAME_TOO_SHORT: `Surname must be at least ${AUTHOR_CONSTRAINTS.SURNAME.MIN_LENGTH} character`,
  SURNAME_TOO_LONG: `Surname must be at most ${AUTHOR_CONSTRAINTS.SURNAME.MAX_LENGTH} characters`,
  SURNAME_INVALID_CHARS: 'Surname can only contain letters, spaces, hyphens, and apostrophes',
  NATIONALITY_TOO_LONG: `Nationality must be at most ${AUTHOR_CONSTRAINTS.NATIONALITY.MAX_LENGTH} characters`,
} as const);
