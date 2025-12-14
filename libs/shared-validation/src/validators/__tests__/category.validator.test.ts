/**
 * Category Validator Tests
 */

import {
  validateCategoryName,
  isValidCategoryName,
} from '../category.validator';
import { CATEGORY_ERROR_MESSAGES } from '../../constants/category.constants';

describe('category.validator', () => {
  describe('validateCategoryName', () => {
    it('should validate valid category names', () => {
      expect(validateCategoryName('Fiction')).toEqual({ isValid: true });
      expect(validateCategoryName('Science Fiction')).toEqual({ isValid: true });
      expect(validateCategoryName('Non-Fiction')).toEqual({ isValid: true });
      expect(validateCategoryName('A')).toEqual({ isValid: true }); // Min length
      expect(validateCategoryName('a'.repeat(255))).toEqual({ isValid: true }); // Max length
    });

    it('should reject empty category name', () => {
      const result = validateCategoryName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CATEGORY_ERROR_MESSAGES.NAME_REQUIRED);
      expect(result.errorCode).toBe('NAME_REQUIRED');
    });

    it('should reject category name that is too long', () => {
      const longName = 'a'.repeat(256);
      const result = validateCategoryName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(CATEGORY_ERROR_MESSAGES.NAME_TOO_LONG);
      expect(result.errorCode).toBe('NAME_TOO_LONG');
    });

    it('should trim whitespace', () => {
      expect(validateCategoryName('  Fiction  ')).toEqual({ isValid: true });
    });

    it('should allow special characters and numbers', () => {
      expect(validateCategoryName('Sci-Fi')).toEqual({ isValid: true });
      expect(validateCategoryName('20th Century')).toEqual({ isValid: true });
      expect(validateCategoryName('Mystery & Thriller')).toEqual({ isValid: true });
    });
  });

  describe('isValidCategoryName', () => {
    it('should return true for valid category names', () => {
      expect(isValidCategoryName('Fiction')).toBe(true);
      expect(isValidCategoryName('Science Fiction')).toBe(true);
      expect(isValidCategoryName('A')).toBe(true);
    });

    it('should return false for invalid category names', () => {
      expect(isValidCategoryName('')).toBe(false);
      expect(isValidCategoryName('a'.repeat(256))).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidCategoryName('  Fiction  ')).toBe(true);
    });
  });
});
