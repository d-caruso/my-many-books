/**
 * Author Validation Functions
 *
 * Pure TypeScript validation functions for author fields.
 * Framework-agnostic, can be used by Joi, Zod, or custom validators.
 */

import {
  AUTHOR_CONSTRAINTS,
  AUTHOR_PATTERNS,
  AUTHOR_ERROR_MESSAGES,
} from '../constants/author.constants';
import { ValidationResult } from '../types/validation.types';
import { isEmpty, trim } from '../utils/string.utils';

/**
 * Validate author name (first name)
 */
export function validateAuthorName(name: string): ValidationResult {
  if (isEmpty(name)) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.NAME_REQUIRED,
      errorCode: 'NAME_REQUIRED',
    };
  }

  const trimmed = trim(name);

  if (trimmed.length < AUTHOR_CONSTRAINTS.NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.NAME_TOO_SHORT,
      errorCode: 'NAME_TOO_SHORT',
    };
  }

  if (trimmed.length > AUTHOR_CONSTRAINTS.NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.NAME_TOO_LONG,
      errorCode: 'NAME_TOO_LONG',
    };
  }

  if (!AUTHOR_PATTERNS.NAME.test(trimmed)) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.NAME_INVALID_CHARS,
      errorCode: 'NAME_INVALID_CHARS',
    };
  }

  return { isValid: true };
}

/**
 * Validate author surname (last name)
 */
export function validateAuthorSurname(surname: string): ValidationResult {
  if (isEmpty(surname)) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.SURNAME_REQUIRED,
      errorCode: 'SURNAME_REQUIRED',
    };
  }

  const trimmed = trim(surname);

  if (trimmed.length < AUTHOR_CONSTRAINTS.SURNAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.SURNAME_TOO_SHORT,
      errorCode: 'SURNAME_TOO_SHORT',
    };
  }

  if (trimmed.length > AUTHOR_CONSTRAINTS.SURNAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.SURNAME_TOO_LONG,
      errorCode: 'SURNAME_TOO_LONG',
    };
  }

  if (!AUTHOR_PATTERNS.NAME.test(trimmed)) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.SURNAME_INVALID_CHARS,
      errorCode: 'SURNAME_INVALID_CHARS',
    };
  }

  return { isValid: true };
}

/**
 * Validate author nationality (optional)
 */
export function validateNationality(nationality: string | null | undefined): ValidationResult {
  if (nationality === null || nationality === undefined || nationality === '') {
    return { isValid: true }; // Nationality is optional
  }

  const trimmed = trim(nationality);

  if (trimmed.length > AUTHOR_CONSTRAINTS.NATIONALITY.MAX_LENGTH) {
    return {
      isValid: false,
      error: AUTHOR_ERROR_MESSAGES.NATIONALITY_TOO_LONG,
      errorCode: 'NATIONALITY_TOO_LONG',
    };
  }

  return { isValid: true };
}

/**
 * Check if a name string is valid (for quick validation)
 */
export function isValidName(name: string): boolean {
  if (isEmpty(name)) {
    return false;
  }

  const trimmed = trim(name);

  return (
    trimmed.length >= AUTHOR_CONSTRAINTS.NAME.MIN_LENGTH &&
    trimmed.length <= AUTHOR_CONSTRAINTS.NAME.MAX_LENGTH &&
    AUTHOR_PATTERNS.NAME.test(trimmed)
  );
}
