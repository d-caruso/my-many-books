/**
 * Author Validator Tests
 */

import {
  validateAuthorName,
  validateAuthorSurname,
  validateNationality,
  isValidName,
} from '../author.validator';
import { AUTHOR_ERROR_MESSAGES } from '../../constants/author.constants';

describe('author.validator', () => {
  describe('validateAuthorName', () => {
    it('should validate valid names', () => {
      expect(validateAuthorName('John')).toEqual({ isValid: true });
      expect(validateAuthorName('Mary-Jane')).toEqual({ isValid: true });
      expect(validateAuthorName("O'Brien")).toEqual({ isValid: true });
      expect(validateAuthorName('José')).toEqual({ isValid: true }); // Accented
      expect(validateAuthorName('François')).toEqual({ isValid: true });
    });

    it('should reject empty name', () => {
      const result = validateAuthorName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.NAME_REQUIRED);
      expect(result.errorCode).toBe('NAME_REQUIRED');
    });

    it('should reject name that is too long', () => {
      const longName = 'a'.repeat(256);
      const result = validateAuthorName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.NAME_TOO_LONG);
      expect(result.errorCode).toBe('NAME_TOO_LONG');
    });

    it('should reject name with invalid characters', () => {
      const result1 = validateAuthorName('John123');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBe(AUTHOR_ERROR_MESSAGES.NAME_INVALID_CHARS);

      const result2 = validateAuthorName('John@Doe');
      expect(result2.isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateAuthorName('  John  ')).toEqual({ isValid: true });
    });
  });

  describe('validateAuthorSurname', () => {
    it('should validate valid surnames', () => {
      expect(validateAuthorSurname('Doe')).toEqual({ isValid: true });
      expect(validateAuthorSurname('Smith-Jones')).toEqual({ isValid: true });
      expect(validateAuthorSurname("O'Connor")).toEqual({ isValid: true });
      expect(validateAuthorSurname('García')).toEqual({ isValid: true });
    });

    it('should reject empty surname', () => {
      const result = validateAuthorSurname('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.SURNAME_REQUIRED);
      expect(result.errorCode).toBe('SURNAME_REQUIRED');
    });

    it('should reject surname that is too long', () => {
      const longSurname = 'a'.repeat(256);
      const result = validateAuthorSurname(longSurname);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.SURNAME_TOO_LONG);
      expect(result.errorCode).toBe('SURNAME_TOO_LONG');
    });

    it('should reject surname with invalid characters', () => {
      const result = validateAuthorSurname('Doe123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.SURNAME_INVALID_CHARS);
      expect(result.errorCode).toBe('SURNAME_INVALID_CHARS');
    });

    it('should trim whitespace', () => {
      expect(validateAuthorSurname('  Doe  ')).toEqual({ isValid: true });
    });
  });

  describe('validateNationality', () => {
    it('should validate valid nationalities', () => {
      expect(validateNationality('American')).toEqual({ isValid: true });
      expect(validateNationality('British')).toEqual({ isValid: true });
    });

    it('should allow empty/null/undefined nationality', () => {
      expect(validateNationality('')).toEqual({ isValid: true });
      expect(validateNationality(null)).toEqual({ isValid: true });
      expect(validateNationality(undefined)).toEqual({ isValid: true });
    });

    it('should reject nationality that is too long', () => {
      const longNationality = 'a'.repeat(256);
      const result = validateNationality(longNationality);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(AUTHOR_ERROR_MESSAGES.NATIONALITY_TOO_LONG);
      expect(result.errorCode).toBe('NATIONALITY_TOO_LONG');
    });

    it('should trim whitespace', () => {
      expect(validateNationality('  American  ')).toEqual({ isValid: true });
    });
  });

  describe('isValidName', () => {
    it('should return true for valid names', () => {
      expect(isValidName('John')).toBe(true);
      expect(isValidName('Mary-Jane')).toBe(true);
      expect(isValidName("O'Brien")).toBe(true);
      expect(isValidName('José')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('John123')).toBe(false);
      expect(isValidName('a'.repeat(256))).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidName('  John  ')).toBe(true);
    });
  });
});
