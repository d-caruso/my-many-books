/**
 * Book Validator Tests
 */

import {
  validateTitle,
  validateNotes,
  validateStatus,
  validateEditionNumber,
  validateEditionDate,
  isValidBookStatus,
} from '../book.validator';
import { BOOK_ERROR_MESSAGES } from '../../constants/book.constants';

describe('book.validator', () => {
  describe('validateTitle', () => {
    it('should validate valid titles', () => {
      expect(validateTitle('1984')).toEqual({ isValid: true });
      expect(validateTitle('The Great Gatsby')).toEqual({ isValid: true });
      expect(validateTitle('A')).toEqual({ isValid: true }); // Min length
    });

    it('should reject empty title', () => {
      const result = validateTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(BOOK_ERROR_MESSAGES.TITLE_REQUIRED);
      expect(result.errorCode).toBe('TITLE_REQUIRED');
    });

    it('should reject title that is too long', () => {
      const longTitle = 'a'.repeat(501);
      const result = validateTitle(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(BOOK_ERROR_MESSAGES.TITLE_TOO_LONG);
      expect(result.errorCode).toBe('TITLE_TOO_LONG');
    });

    it('should trim whitespace', () => {
      expect(validateTitle('  Valid Title  ')).toEqual({ isValid: true });
    });
  });

  describe('validateNotes', () => {
    it('should validate valid notes', () => {
      expect(validateNotes('Great book!')).toEqual({ isValid: true });
      expect(validateNotes('a'.repeat(2000))).toEqual({ isValid: true }); // Max length
    });

    it('should allow empty/null/undefined notes', () => {
      expect(validateNotes('')).toEqual({ isValid: true });
      expect(validateNotes(null)).toEqual({ isValid: true });
      expect(validateNotes(undefined)).toEqual({ isValid: true });
    });

    it('should reject notes that are too long', () => {
      const longNotes = 'a'.repeat(2001);
      const result = validateNotes(longNotes);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(BOOK_ERROR_MESSAGES.NOTES_TOO_LONG);
      expect(result.errorCode).toBe('NOTES_TOO_LONG');
    });
  });

  describe('validateStatus', () => {
    it('should validate valid statuses', () => {
      expect(validateStatus('reading')).toEqual({ isValid: true });
      expect(validateStatus('paused')).toEqual({ isValid: true });
      expect(validateStatus('finished')).toEqual({ isValid: true });
      expect(validateStatus('TO_READ')).toEqual({ isValid: true });
    });

    it('should reject invalid status', () => {
      const result = validateStatus('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(BOOK_ERROR_MESSAGES.INVALID_STATUS);
      expect(result.errorCode).toBe('INVALID_STATUS');
    });
  });

  describe('validateEditionNumber', () => {
    it('should validate valid edition numbers', () => {
      expect(validateEditionNumber(1)).toEqual({ isValid: true });
      expect(validateEditionNumber(5)).toEqual({ isValid: true });
      expect(validateEditionNumber(100)).toEqual({ isValid: true });
    });

    it('should allow null/undefined edition number', () => {
      expect(validateEditionNumber(null)).toEqual({ isValid: true });
      expect(validateEditionNumber(undefined)).toEqual({ isValid: true });
    });

    it('should reject invalid edition numbers', () => {
      const result1 = validateEditionNumber(0);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe(BOOK_ERROR_MESSAGES.EDITION_NUMBER_INVALID);

      const result2 = validateEditionNumber(-1);
      expect(result2.isValid).toBe(false);

      const result3 = validateEditionNumber(1.5);
      expect(result3.isValid).toBe(false);
    });
  });

  describe('validateEditionDate', () => {
    it('should validate valid dates', () => {
      expect(validateEditionDate('2023-01-01')).toEqual({ isValid: true });
      expect(validateEditionDate(new Date('2023-01-01'))).toEqual({ isValid: true });
      expect(validateEditionDate('2023-12-31T23:59:59Z')).toEqual({ isValid: true });
    });

    it('should allow empty/null/undefined edition date', () => {
      expect(validateEditionDate('')).toEqual({ isValid: true });
      expect(validateEditionDate(null)).toEqual({ isValid: true });
      expect(validateEditionDate(undefined)).toEqual({ isValid: true });
    });

    it('should reject invalid dates', () => {
      const result = validateEditionDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(BOOK_ERROR_MESSAGES.EDITION_DATE_INVALID);
      expect(result.errorCode).toBe('EDITION_DATE_INVALID');
    });
  });

  describe('isValidBookStatus', () => {
    it('should return true for valid statuses', () => {
      expect(isValidBookStatus('reading')).toBe(true);
      expect(isValidBookStatus('paused')).toBe(true);
      expect(isValidBookStatus('finished')).toBe(true);
      expect(isValidBookStatus('TO_READ')).toBe(true);
    });

    it('should return false for invalid statuses', () => {
      expect(isValidBookStatus('invalid')).toBe(false);
      expect(isValidBookStatus('READING')).toBe(false); // Case sensitive
      expect(isValidBookStatus('')).toBe(false);
    });
  });
});
