/**
 * ISBN Validation Constants
 *
 * Single source of truth for ISBN validation rules and constraints.
 * Used by both frontend and backend to ensure consistent validation.
 */

/**
 * ISBN format constraints
 */
export const ISBN_CONSTRAINTS = Object.freeze({
  /** Minimum length for a valid ISBN (ISBN-10) */
  MIN_LENGTH: 10,

  /** Maximum length for a valid ISBN (ISBN-13) */
  MAX_LENGTH: 13,

  /** Valid ISBN lengths */
  VALID_LENGTHS: Object.freeze([10, 13] as const),

  /** ISBN-10 specific length */
  ISBN_10_LENGTH: 10,

  /** ISBN-13 specific length */
  ISBN_13_LENGTH: 13,

  /** Valid ISBN-13 prefixes */
  VALID_PREFIXES: Object.freeze(['978', '979'] as const),
} as const);

/**
 * ISBN validation regex patterns
 */
export const ISBN_PATTERNS = Object.freeze({
  /** Pattern for normalized ISBN (digits and X only, case insensitive) */
  NORMALIZED: /^[\dX]{10,13}$/i,

  /** Pattern for ISBN-10 format (9 digits + digit or X) */
  ISBN_10: /^\d{9}[\dX]$/i,

  /** Pattern for ISBN-13 format (13 digits only) */
  ISBN_13: /^\d{13}$/,

  /** Pattern to check if first 9 chars are digits */
  FIRST_NINE_DIGITS: /^\d{9}$/,

  /** Pattern to check if all chars are digits */
  ALL_DIGITS: /^\d+$/,

  /** Pattern to check last char of ISBN-10 (digit or X) */
  LAST_CHAR_ISBN_10: /^[\dX]$/i,

  /** Pattern to extract ISBN-13 from text */
  EXTRACT_ISBN_13: /\b\d{13}\b/g,

  /** Pattern to extract ISBN-10 from text */
  EXTRACT_ISBN_10: /\b\d{9}[\dX]\b/gi,

  /** Characters to remove during normalization */
  NON_ISBN_CHARS: /[^0-9X]/gi,
} as const);

/**
 * ISBN error message keys for i18n
 */
export const ISBN_ERROR_KEYS = Object.freeze({
  INVALID_ISBN_LENGTH: 'isbn.errors.invalid_length',
  NO_VALID_ISBN_FOUND: 'isbn.errors.no_valid_found',
  EXPECTED_LENGTH: 'isbn.errors.expected_length',
  ISBN_REQUIRED: 'isbn.errors.required',
  ISBN_10_MUST_BE_10_CHAR: 'isbn.errors.isbn10_length',
  ISBN_13_MUST_BE_13_CHAR: 'isbn.errors.isbn13_length',
  ISBN_10_MUST_BE_DIGITS: 'isbn.errors.isbn10_digits',
  ISBN_10_LAST_CHAR: 'isbn.errors.isbn10_last_char',
  ISBN_13_PREFIX: 'isbn.errors.isbn13_prefix',
  ISBN_13_DIGITS_ONLY: 'isbn.errors.isbn13_digits_only',
  ISBN_10_INVALID_CHECKSUM: 'isbn.errors.isbn10_checksum',
  ISBN_13_INVALID_CHECKSUM: 'isbn.errors.isbn13_checksum',
  INVALID_FORMAT: 'isbn.errors.invalid_format',
} as const);

/**
 * ISBN error messages (fallback when i18n not available)
 */
export const ISBN_ERROR_MESSAGES = Object.freeze({
  INVALID_ISBN_LENGTH: 'Invalid ISBN length',
  NO_VALID_ISBN_FOUND: 'No valid ISBN found',
  EXPECTED_LENGTH: 'Expected 10 or 13 digits',
  ISBN_REQUIRED: 'ISBN is required',
  ISBN_10_MUST_BE_10_CHAR: 'ISBN-10 must be exactly 10 characters',
  ISBN_13_MUST_BE_13_CHAR: 'ISBN-13 must be exactly 13 characters',
  ISBN_10_MUST_BE_DIGITS: 'First 9 characters of ISBN-10 must be digits',
  ISBN_10_LAST_CHAR: 'Last character of ISBN-10 must be a digit or X',
  ISBN_13_PREFIX: 'ISBN-13 must start with 978 or 979',
  ISBN_13_DIGITS_ONLY: 'ISBN-13 must contain only digits',
  ISBN_10_INVALID_CHECKSUM: 'Invalid ISBN-10 checksum',
  ISBN_13_INVALID_CHECKSUM: 'Invalid ISBN-13 checksum',
  INVALID_FORMAT: 'Invalid ISBN format',
} as const);

/**
 * ISBN checksum calculation constants
 */
export const ISBN_CHECKSUM = Object.freeze({
  /** Modulo value for ISBN-10 checksum */
  ISBN_10_MODULO: 11,

  /** Modulo value for ISBN-13 checksum */
  ISBN_13_MODULO: 10,

  /** Value of 'X' character in ISBN-10 checksum */
  X_VALUE: 10,

  /** Multiplier for even position digits in ISBN-13 */
  ISBN_13_EVEN_MULTIPLIER: 1,

  /** Multiplier for odd position digits in ISBN-13 */
  ISBN_13_ODD_MULTIPLIER: 3,
} as const);
