/**
 * Book Validation Functions
 *
 * Pure TypeScript validation functions for book fields.
 * Framework-agnostic, can be used by Joi, Zod, or custom validators.
 */

import {
  BOOK_CONSTRAINTS,
  BOOK_STATUS,
  VALID_BOOK_STATUSES,
  BOOK_ERROR_MESSAGES,
  BookStatus,
} from '../constants/book.constants';
import { ValidationResult } from '../types/validation.types';
import { isEmpty, trim } from '../utils/string.utils';

/**
 * Validate book title
 */
export function validateTitle(title: string): ValidationResult {
  if (isEmpty(title)) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_REQUIRED,
      errorCode: 'TITLE_REQUIRED',
    };
  }

  const trimmed = trim(title);

  if (trimmed.length < BOOK_CONSTRAINTS.TITLE.MIN_LENGTH) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_TOO_SHORT,
      errorCode: 'TITLE_TOO_SHORT',
    };
  }

  if (trimmed.length > BOOK_CONSTRAINTS.TITLE.MAX_LENGTH) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_TOO_LONG,
      errorCode: 'TITLE_TOO_LONG',
    };
  }

  return { isValid: true };
}

/**
 * Validate book notes
 */
export function validateNotes(notes: string | null | undefined): ValidationResult {
  if (notes === null || notes === undefined || notes === '') {
    return { isValid: true }; // Notes are optional
  }

  if (notes.length > BOOK_CONSTRAINTS.NOTES.MAX_LENGTH) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.NOTES_TOO_LONG,
      errorCode: 'NOTES_TOO_LONG',
    };
  }

  return { isValid: true };
}

/**
 * Validate book status
 */
export function validateStatus(status: string): ValidationResult {
  if (!VALID_BOOK_STATUSES.includes(status as BookStatus)) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.INVALID_STATUS,
      errorCode: 'INVALID_STATUS',
    };
  }

  return { isValid: true };
}

/**
 * Validate edition number
 */
export function validateEditionNumber(editionNumber: number | null | undefined): ValidationResult {
  if (editionNumber === null || editionNumber === undefined) {
    return { isValid: true }; // Edition number is optional
  }

  if (!Number.isInteger(editionNumber) || editionNumber < BOOK_CONSTRAINTS.EDITION_NUMBER.MIN) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.EDITION_NUMBER_INVALID,
      errorCode: 'EDITION_NUMBER_INVALID',
    };
  }

  return { isValid: true };
}

/**
 * Validate edition date
 */
export function validateEditionDate(editionDate: string | Date | null | undefined): ValidationResult {
  if (editionDate === null || editionDate === undefined || editionDate === '') {
    return { isValid: true }; // Edition date is optional
  }

  // Try to parse as Date
  const date = typeof editionDate === 'string' ? new Date(editionDate) : editionDate;

  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.EDITION_DATE_INVALID,
      errorCode: 'EDITION_DATE_INVALID',
    };
  }

  return { isValid: true };
}

/**
 * Check if a string is a valid book status
 */
export function isValidBookStatus(status: string): boolean {
  return VALID_BOOK_STATUSES.includes(status as BookStatus);
}
