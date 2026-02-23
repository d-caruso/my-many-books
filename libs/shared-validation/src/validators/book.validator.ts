/**
 * Book Validation Functions
 *
 * Pure TypeScript validation functions for book fields.
 * Framework-agnostic, can be used by Joi, Zod, or custom validators.
 */

import { BOOK_CONSTRAINTS, BOOK_ERROR_MESSAGES, EDITION_DATE_PATTERN } from '../constants/book.constants';
import { BOOK_STATUSES } from '@my-many-books/shared-types';
import { ValidationResult } from '../types/validation.types';
import { isEmpty, trim } from '../utils/string.utils';
import { getI18nKey } from '../errors/i18n-keys';
import { BookStatus } from '@my-many-books/shared-types'

function invalidEditionDateResult(): ValidationResult {
  const errorCode = 'EDITION_DATE_INVALID';
  return {
    isValid: false,
    error: BOOK_ERROR_MESSAGES.EDITION_DATE_INVALID,
    errorCode,
    i18nKey: getI18nKey(errorCode),
  };
}

function isValidEditionYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1 && year <= new Date().getFullYear();
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getMaxDaysForMonth(year: number, month: number): number {
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }

  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return 31;
}

/**
 * Validate book title
 */
export function validateTitle(title: string): ValidationResult {
  if (isEmpty(title)) {
    const errorCode = 'TITLE_REQUIRED';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_REQUIRED,
      errorCode,
      i18nKey: getI18nKey(errorCode),
    };
  }

  const trimmed = trim(title);

  if (trimmed.length < BOOK_CONSTRAINTS.TITLE.MIN_LENGTH) {
    const errorCode = 'TITLE_TOO_SHORT';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_TOO_SHORT,
      errorCode,
      i18nKey: getI18nKey(errorCode),
    };
  }

  if (trimmed.length > BOOK_CONSTRAINTS.TITLE.MAX_LENGTH) {
    const errorCode = 'TITLE_TOO_LONG';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.TITLE_TOO_LONG,
      errorCode,
      i18nKey: getI18nKey(errorCode),
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
    const errorCode = 'NOTES_TOO_LONG';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.NOTES_TOO_LONG,
      errorCode,
      i18nKey: getI18nKey(errorCode),
    };
  }

  return { isValid: true };
}

/**
 * Validate book status
 */
export function validateStatus(status: string): ValidationResult {
  if (!BOOK_STATUSES.includes(status as BookStatus)) {
    const errorCode = 'INVALID_STATUS';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.INVALID_STATUS,
      errorCode,
      i18nKey: getI18nKey(errorCode),
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
    const errorCode = 'EDITION_NUMBER_INVALID';
    return {
      isValid: false,
      error: BOOK_ERROR_MESSAGES.EDITION_NUMBER_INVALID,
      errorCode,
      i18nKey: getI18nKey(errorCode),
    };
  }

  return { isValid: true };
}

/**
 * Validate edition date.
 * Accepts flexible granularity: "YYYY", "YYYY-MM", or "YYYY-MM-DD".
 */
export function validateEditionDate(editionDate: string | null | undefined): ValidationResult {
  if (editionDate === null || editionDate === undefined || editionDate === '') {
    return { isValid: true };
  }

  if (!EDITION_DATE_PATTERN.test(editionDate)) {
    return invalidEditionDateResult();
  }

  const [yearPart, monthPart, dayPart] = editionDate.split('-');
  if (yearPart === undefined) {
    return invalidEditionDateResult();
  }

  const year = Number(yearPart);
  const month = monthPart !== undefined ? Number(monthPart) : undefined;
  const day = dayPart !== undefined ? Number(dayPart) : undefined;

  if (!isValidEditionYear(year)) {
    return invalidEditionDateResult();
  }

  if (month !== undefined && (month < 1 || month > 12)) {
    return invalidEditionDateResult();
  }

  if (day !== undefined) {
    if (day < 1) {
      return invalidEditionDateResult();
    }

    const effectiveMonth = month ?? 1;
    const maxDays = getMaxDaysForMonth(year, effectiveMonth);
    if (day > maxDays) {
      return invalidEditionDateResult();
    }
  }

  return { isValid: true };
}

/**
 * Check if a string is a valid book status
 */
export function isValidBookStatus(status: string): boolean {
  return BOOK_STATUSES.includes(status as BookStatus);
}
