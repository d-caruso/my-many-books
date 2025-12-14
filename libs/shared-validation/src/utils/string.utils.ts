/**
 * String Utility Functions
 *
 * Helper functions for string normalization and manipulation
 * used in validation logic.
 */

import { ISBN_PATTERNS } from '../constants/isbn.constants';

/**
 * Normalizes an ISBN string by removing hyphens, spaces, and converting to uppercase
 *
 * @param isbn - Raw ISBN string
 * @returns Normalized ISBN (only digits and X)
 *
 * @example
 * normalizeIsbn('978-0-439-42089-4') // Returns: '9780439420894'
 * normalizeIsbn('0-439-42089-0')      // Returns: '0439420890'
 * normalizeIsbn('043942089X')         // Returns: '043942089X'
 */
export function normalizeIsbn(isbn: string): string {
  if (!isbn || typeof isbn !== 'string') {
    return '';
  }

  return isbn.replace(ISBN_PATTERNS.NON_ISBN_CHARS, '').toUpperCase();
}

/**
 * Removes all whitespace from a string
 *
 * @param value - Input string
 * @returns String with all whitespace removed
 */
export function removeWhitespace(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, '');
}

/**
 * Trims whitespace and converts to uppercase
 *
 * @param value - Input string
 * @returns Trimmed and uppercased string
 */
export function normalizeUppercase(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}

/**
 * Trims leading and trailing whitespace from a string
 *
 * @param value - Input string
 * @returns Trimmed string
 */
export function trim(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

/**
 * Checks if a string is null, undefined, or empty after trimming
 *
 * @param value - Input string
 * @returns True if string is empty/null/undefined
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Checks if a string contains only digits
 *
 * @param value - Input string
 * @returns True if string contains only digits
 */
export function isNumeric(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return ISBN_PATTERNS.ALL_DIGITS.test(value);
}

/**
 * Safely converts a value to string
 *
 * @param value - Input value
 * @returns String representation or empty string if null/undefined
 */
export function toString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

/**
 * Truncates a string to a maximum length
 *
 * @param value - Input string
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append if truncated (default: '...')
 * @returns Truncated string
 */
export function truncate(value: string, maxLength: number, suffix: string = '...'): string {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return value.substring(0, maxLength - suffix.length) + suffix;
}
