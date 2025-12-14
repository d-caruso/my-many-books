/**
 * ISBN Validation Logic
 *
 * Pure functions for validating ISBN-10 and ISBN-13 formats.
 * Includes checksum validation and format conversion.
 */

import {
  ISBN_CONSTRAINTS,
  ISBN_PATTERNS,
  ISBN_ERROR_MESSAGES,
  ISBN_CHECKSUM,
} from '../constants/isbn.constants';
import { IsbnValidationResult } from '../types/validation.types';
import { normalizeIsbn, isEmpty } from '../utils/string.utils';

/**
 * Validates an ISBN string (ISBN-10 or ISBN-13)
 *
 * @param isbn - Raw ISBN string from scanner or user input
 * @returns Validation result with normalized ISBN
 *
 * @example
 * validateIsbn('978-0-439-42089-4')
 * // Returns: { isValid: true, normalizedIsbn: '9780439420894', format: 'ISBN-13' }
 *
 * validateIsbn('0-439-42089-X')
 * // Returns: { isValid: true, normalizedIsbn: '9780439420894', format: 'ISBN-10' }
 *
 * validateIsbn('invalid')
 * // Returns: { isValid: false, error: 'Invalid ISBN length...' }
 */
export function validateIsbn(isbn: string): IsbnValidationResult {
  if (isEmpty(isbn)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_REQUIRED,
      errorCode: 'ISBN_REQUIRED',
    };
  }

  const cleanIsbn = normalizeIsbn(isbn);

  if (cleanIsbn.length === 0) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.NO_VALID_ISBN_FOUND,
      errorCode: 'NO_VALID_ISBN_FOUND',
    };
  }

  // Validate based on length
  if (cleanIsbn.length === ISBN_CONSTRAINTS.ISBN_10_LENGTH) {
    const isbn10Result = validateIsbn10(cleanIsbn);
    if (isbn10Result.isValid && isbn10Result.normalizedIsbn) {
      // Convert ISBN-10 to ISBN-13 for consistency
      const isbn13 = convertIsbn10ToIsbn13(isbn10Result.normalizedIsbn);
      return {
        isValid: true,
        normalizedIsbn: isbn13,
        format: 'ISBN-10',
      };
    }
    return isbn10Result;
  }

  if (cleanIsbn.length === ISBN_CONSTRAINTS.ISBN_13_LENGTH) {
    return validateIsbn13(cleanIsbn);
  }

  return {
    isValid: false,
    error: `${ISBN_ERROR_MESSAGES.INVALID_ISBN_LENGTH}: ${cleanIsbn.length}. ${ISBN_ERROR_MESSAGES.EXPECTED_LENGTH}`,
    errorCode: 'INVALID_ISBN_LENGTH',
  };
}

/**
 * Validates ISBN-10 format and checksum
 *
 * @param isbn - Normalized ISBN-10 string (10 characters)
 * @returns Validation result
 */
export function validateIsbn10(isbn: string): IsbnValidationResult {
  if (isbn.length !== ISBN_CONSTRAINTS.ISBN_10_LENGTH) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_10_CHAR,
      errorCode: 'ISBN_10_LENGTH',
    };
  }

  // Check that first 9 characters are digits
  const firstNine = isbn.substring(0, 9);
  if (!ISBN_PATTERNS.FIRST_NINE_DIGITS.test(firstNine)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_DIGITS,
      errorCode: 'ISBN_10_DIGITS',
    };
  }

  // Last character can be digit or X
  const checkChar = isbn.charAt(9);
  if (!ISBN_PATTERNS.LAST_CHAR_ISBN_10.test(checkChar)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_10_LAST_CHAR,
      errorCode: 'ISBN_10_LAST_CHAR',
    };
  }

  // Validate checksum
  if (!validateIsbn10Checksum(isbn)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_10_INVALID_CHECKSUM,
      errorCode: 'ISBN_10_CHECKSUM',
    };
  }

  return {
    isValid: true,
    normalizedIsbn: isbn,
    format: 'ISBN-10',
  };
}

/**
 * Validates ISBN-13 format and checksum
 *
 * @param isbn - Normalized ISBN-13 string (13 characters)
 * @returns Validation result
 */
export function validateIsbn13(isbn: string): IsbnValidationResult {
  if (isbn.length !== ISBN_CONSTRAINTS.ISBN_13_LENGTH) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_13_MUST_BE_13_CHAR,
      errorCode: 'ISBN_13_LENGTH',
    };
  }

  // Check that all characters are digits
  if (!ISBN_PATTERNS.ISBN_13.test(isbn)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_13_DIGITS_ONLY,
      errorCode: 'ISBN_13_DIGITS_ONLY',
    };
  }

  // Check prefix (must start with 978 or 979)
  const prefix = isbn.substring(0, 3);
  if (!ISBN_CONSTRAINTS.VALID_PREFIXES.includes(prefix as '978' | '979')) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_13_PREFIX,
      errorCode: 'ISBN_13_PREFIX',
    };
  }

  // Validate checksum
  if (!validateIsbn13Checksum(isbn)) {
    return {
      isValid: false,
      error: ISBN_ERROR_MESSAGES.ISBN_13_INVALID_CHECKSUM,
      errorCode: 'ISBN_13_CHECKSUM',
    };
  }

  return {
    isValid: true,
    normalizedIsbn: isbn,
    format: 'ISBN-13',
  };
}

/**
 * Validates ISBN-10 checksum using modulo 11 algorithm
 *
 * @param isbn - ISBN-10 string (10 characters)
 * @returns True if checksum is valid
 */
export function validateIsbn10Checksum(isbn: string): boolean {
  if (isbn.length !== ISBN_CONSTRAINTS.ISBN_10_LENGTH) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn.charAt(i)) * (10 - i);
  }

  const checkChar = isbn.charAt(9);
  const checkValue = checkChar === 'X' ? ISBN_CHECKSUM.X_VALUE : parseInt(checkChar);
  sum += checkValue;

  return sum % ISBN_CHECKSUM.ISBN_10_MODULO === 0;
}

/**
 * Validates ISBN-13 checksum using modulo 10 algorithm
 *
 * @param isbn - ISBN-13 string (13 characters)
 * @returns True if checksum is valid
 */
export function validateIsbn13Checksum(isbn: string): boolean {
  if (isbn.length !== ISBN_CONSTRAINTS.ISBN_13_LENGTH) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn.charAt(i));
    const multiplier =
      i % 2 === 0
        ? ISBN_CHECKSUM.ISBN_13_EVEN_MULTIPLIER
        : ISBN_CHECKSUM.ISBN_13_ODD_MULTIPLIER;
    sum += digit * multiplier;
  }

  const checkDigit = parseInt(isbn.charAt(12));
  const calculatedCheck = (ISBN_CHECKSUM.ISBN_13_MODULO - (sum % ISBN_CHECKSUM.ISBN_13_MODULO)) % ISBN_CHECKSUM.ISBN_13_MODULO;

  return checkDigit === calculatedCheck;
}

/**
 * Converts ISBN-10 to ISBN-13
 *
 * @param isbn10 - Valid ISBN-10 string
 * @returns ISBN-13 string
 *
 * @example
 * convertIsbn10ToIsbn13('043942089X')
 * // Returns: '9780439420894'
 */
export function convertIsbn10ToIsbn13(isbn10: string): string {
  if (isbn10.length !== ISBN_CONSTRAINTS.ISBN_10_LENGTH) {
    throw new Error('Invalid ISBN-10 length');
  }

  // Remove check digit and add 978 prefix
  const base = '978' + isbn10.substring(0, 9);

  // Calculate new check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base.charAt(i));
    const multiplier =
      i % 2 === 0
        ? ISBN_CHECKSUM.ISBN_13_EVEN_MULTIPLIER
        : ISBN_CHECKSUM.ISBN_13_ODD_MULTIPLIER;
    sum += digit * multiplier;
  }

  const checkDigit = (ISBN_CHECKSUM.ISBN_13_MODULO - (sum % ISBN_CHECKSUM.ISBN_13_MODULO)) % ISBN_CHECKSUM.ISBN_13_MODULO;
  return base + checkDigit.toString();
}

/**
 * Formats ISBN with standard hyphens for display
 *
 * @param isbn - Raw ISBN string
 * @returns Formatted ISBN or original if invalid
 *
 * @example
 * formatIsbnForDisplay('9780439420894')
 * // Returns: '978-0-439-42089-4'
 */
export function formatIsbnForDisplay(isbn: string): string {
  const validation = validateIsbn(isbn);
  if (!validation.isValid || !validation.normalizedIsbn) {
    return isbn;
  }

  const normalizedIsbn = validation.normalizedIsbn;

  if (normalizedIsbn.length === ISBN_CONSTRAINTS.ISBN_13_LENGTH) {
    // Format ISBN-13: 978-0-123-45678-9
    return `${normalizedIsbn.substring(0, 3)}-${normalizedIsbn.substring(3, 4)}-${normalizedIsbn.substring(4, 7)}-${normalizedIsbn.substring(7, 12)}-${normalizedIsbn.substring(12)}`;
  }

  if (normalizedIsbn.length === ISBN_CONSTRAINTS.ISBN_10_LENGTH) {
    // Format ISBN-10: 0-123-45678-9
    return `${normalizedIsbn.substring(0, 1)}-${normalizedIsbn.substring(1, 4)}-${normalizedIsbn.substring(4, 9)}-${normalizedIsbn.substring(9)}`;
  }

  return normalizedIsbn;
}

/**
 * Quick check if a string could be an ISBN (basic format check)
 *
 * @param input - Input string
 * @returns True if string looks like an ISBN
 */
export function isLikelyIsbn(input: string): boolean {
  if (isEmpty(input)) {
    return false;
  }

  const cleaned = normalizeIsbn(input);
  return cleaned.length === ISBN_CONSTRAINTS.ISBN_10_LENGTH || cleaned.length === ISBN_CONSTRAINTS.ISBN_13_LENGTH;
}

/**
 * Extracts potential ISBN from a longer string
 *
 * @param input - Input string that may contain an ISBN
 * @returns Normalized ISBN if found, null otherwise
 *
 * @example
 * extractIsbn('The book ISBN is 978-0-439-42089-4 and...')
 * // Returns: '9780439420894'
 */
export function extractIsbn(input: string): string | null {
  if (isEmpty(input)) {
    return null;
  }

  // Look for 13-digit sequences
  const isbn13Match = input.match(ISBN_PATTERNS.EXTRACT_ISBN_13);
  if (isbn13Match) {
    const result = validateIsbn(isbn13Match[0]);
    if (result.isValid && result.normalizedIsbn) {
      return result.normalizedIsbn;
    }
  }

  // Look for 10-digit sequences (with possible X at end)
  const isbn10Match = input.match(ISBN_PATTERNS.EXTRACT_ISBN_10);
  if (isbn10Match) {
    const result = validateIsbn(isbn10Match[0]);
    if (result.isValid && result.normalizedIsbn) {
      return result.normalizedIsbn;
    }
  }

  return null;
}

/**
 * Checks if ISBN format is valid (doesn't validate checksum)
 *
 * @param isbn - ISBN string
 * @returns True if format is valid
 */
export function isValidIsbnFormat(isbn: string): boolean {
  if (isEmpty(isbn)) {
    return false;
  }

  const normalized = normalizeIsbn(isbn);
  return ISBN_PATTERNS.NORMALIZED.test(normalized) &&
         (normalized.length === ISBN_CONSTRAINTS.ISBN_10_LENGTH ||
          normalized.length === ISBN_CONSTRAINTS.ISBN_13_LENGTH);
}
