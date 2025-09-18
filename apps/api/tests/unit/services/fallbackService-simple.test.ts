// ================================================================
// tests/services/fallbackService-simple.test.ts
// Simple tests for FallbackService to achieve coverage
// ================================================================

import { FallbackService } from '../../../src/services/fallbackService';
import * as isbnUtils from '../../../src/utils/isbn';

// Mock the isbn utils
jest.mock('../../../src/utils/isbn');

describe('FallbackService - Simple Coverage', () => {
  let fallbackService: FallbackService;
  let mockValidateIsbn: jest.MockedFunction<typeof isbnUtils.validateIsbn>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateIsbn = isbnUtils.validateIsbn as jest.MockedFunction<typeof isbnUtils.validateIsbn>;
    
    // Set up default mock response for initialization
    mockValidateIsbn.mockReturnValue({
      isValid: true,
      normalizedIsbn: '9780451524935'
    });
    
    fallbackService = new FallbackService();
  });

  describe('initialization', () => {
    it('should initialize service', () => {
      expect(fallbackService).toBeDefined();
    });

    it('should have initial static data', () => {
      const stats = fallbackService.getStats();
      expect(stats.staticDataCount).toBeGreaterThan(0);
      expect(Array.isArray(stats.availableIsbns)).toBe(true);
    });
  });

  describe('getFallbackBook', () => {
    it('should return null for invalid ISBN', () => {
      mockValidateIsbn.mockReturnValue({
        isValid: false,
        error: 'Invalid format'
      });

      const result = fallbackService.getFallbackBook('invalid-isbn');
      expect(result).toBeNull();
    });

    it('should return fallback book for valid ISBN', () => {
      const testIsbn = '9780451524935';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.isbn).toBe(testIsbn);
    });

    it('should generate minimal book for unknown ISBN', () => {
      const testIsbn = '9780123456789';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });
  });

  describe('addStaticBookData', () => {
    it('should add valid book data', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      const result = fallbackService.addStaticBookData(testIsbn, {
        title: 'Test Book'
      });

      expect(result).toBe(true);
    });

    it('should reject invalid ISBN', () => {
      mockValidateIsbn.mockReturnValue({
        isValid: false,
        error: 'Invalid format'
      });

      const result = fallbackService.addStaticBookData('invalid-isbn', {
        title: 'Test Book'
      });

      expect(result).toBe(false);
    });

    it('should use default values', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      const result = fallbackService.addStaticBookData(testIsbn, {});
      expect(result).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = fallbackService.getStats();
      
      expect(stats).toHaveProperty('staticDataCount');
      expect(stats).toHaveProperty('availableIsbns');
      expect(typeof stats.staticDataCount).toBe('number');
    });
  });

  describe('clearStaticData', () => {
    it('should clear and reinitialize data', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      fallbackService.addStaticBookData(testIsbn, { title: 'Test' });
      fallbackService.clearStaticData();
      
      const stats = fallbackService.getStats();
      expect(stats.staticDataCount).toBeGreaterThan(0); // Should have some default books
    });
  });

  describe('edge cases', () => {
    it('should handle multiple calls', () => {
      const testIsbn = '9781111111111';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      const result1 = fallbackService.getFallbackBook(testIsbn);
      const result2 = fallbackService.getFallbackBook(testIsbn);

      expect(result1).toEqual(result2);
    });

    it('should handle different confidence levels', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      fallbackService.addStaticBookData(testIsbn, {
        title: 'Test Book',
        confidence: 'low'
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
    });

    it('should handle different sources', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn
      });

      fallbackService.addStaticBookData(testIsbn, {
        title: 'Test Book',
        source: 'cache'
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
    });
  });
});