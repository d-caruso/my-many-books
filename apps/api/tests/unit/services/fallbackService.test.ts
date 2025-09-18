// ================================================================
// tests/services/fallbackService.test.ts
// Comprehensive tests for FallbackService
// ================================================================

import { FallbackService } from '../../../src/services/fallbackService';
import * as isbnUtils from '../../../src/utils/isbn';

// Mock the isbn utils
jest.mock('../../../src/utils/isbn');

describe('FallbackService', () => {
  let fallbackService: FallbackService;
  let mockValidateIsbn: jest.MockedFunction<typeof isbnUtils.validateIsbn>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock for validateIsbn to return valid results for initialization
    mockValidateIsbn = isbnUtils.validateIsbn as jest.MockedFunction<typeof isbnUtils.validateIsbn>;
    mockValidateIsbn.mockImplementation((isbn: string) => ({
      isValid: true,
      normalizedIsbn: isbn,
      format: 'ISBN-13' as const,
    }));
    
    fallbackService = new FallbackService();
  });

  describe('constructor and initialization', () => {
    it('should initialize with static book data', () => {
      const stats = fallbackService.getStats();
      
      expect(stats.staticDataCount).toBe(3);
      expect(stats.availableIsbns).toContain('9780451524935');
      expect(stats.availableIsbns).toContain('9780486284736');
      expect(stats.availableIsbns).toContain('9780060883287');
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
      expect(mockValidateIsbn).toHaveBeenCalledWith('invalid-isbn');
    });

    it('should return static book data when available', () => {
      const testIsbn = '9780451524935';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      const result = fallbackService.getFallbackBook(testIsbn);

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.isbn).toBe(testIsbn);
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe('1984');
      expect(result!.book!.authors![0]!.fullName).toBe('Unknown Author');
      expect(result!.book!.categories![0]!.name).toBe('General');
      expect(result!.source).toBe('api');
    });

    it('should generate minimal book data for unknown ISBN', () => {
      const testIsbn = '9780123456789';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      const result = fallbackService.getFallbackBook(testIsbn);

      expect(result).toBeDefined();
      expect(result!.success).toBe(true);
      expect(result!.isbn).toBe(testIsbn);
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe('Book 6789'); // Last 4 digits
      expect(result!.book!.authors![0]!.fullName).toBe('Unknown Author');
      expect(result!.book!.categories![0]!.name).toBe('Unknown');
      expect(result!.source).toBe('api');
    });

    it('should include correct book structure for fallback data', () => {
      const testIsbn = '9780123456789';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      const result = fallbackService.getFallbackBook(testIsbn);

      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!).toEqual({
        isbnCode: testIsbn,
        title: 'Book 6789',
        authors: [{
          name: 'Unknown',
          surname: 'Author',
          fullName: 'Unknown Author',
          nationality: undefined
        }],
        categories: [{
          name: 'Unknown',
          type: 'subject'
        }],
        subtitle: undefined,
        editionNumber: undefined,
        editionDate: undefined,
        publishers: undefined,
        pages: undefined,
        language: undefined,
        coverUrls: undefined,
        description: undefined,
        physicalFormat: undefined,
        weight: undefined,
        dimensions: undefined
      });
    });
  });

  describe('addStaticBookData', () => {
    it('should add valid book data successfully', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      const result = fallbackService.addStaticBookData(testIsbn, {
        title: 'Test Book',
        source: 'manual',
        confidence: 'high'
      });

      expect(result).toBe(true);
      
      const stats = fallbackService.getStats();
      expect(stats.availableIsbns).toContain(testIsbn);
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
      expect(mockValidateIsbn).toHaveBeenCalledWith('invalid-isbn');
    });

    it('should use default values for missing fields', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      fallbackService.addStaticBookData(testIsbn, {});

      // Verify the book was added with defaults by retrieving it
      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe(`Book ${testIsbn}`);
    });

    it('should allow retrieving added book data', () => {
      const testIsbn = '9781234567890';
      const testTitle = 'Custom Test Book';
      
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      fallbackService.addStaticBookData(testIsbn, {
        title: testTitle,
        source: 'manual',
        confidence: 'high'
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe(testTitle);
      expect(result!.book!.description).toContain('manual source');
      expect(result!.book!.description).toContain('high confidence');
    });
  });

  describe('getStats', () => {
    it('should return current statistics', () => {
      const stats = fallbackService.getStats();

      expect(stats).toHaveProperty('staticDataCount');
      expect(stats).toHaveProperty('availableIsbns');
      expect(typeof stats.staticDataCount).toBe('number');
      expect(Array.isArray(stats.availableIsbns)).toBe(true);
    });

    it('should update statistics when books are added', () => {
      const initialStats = fallbackService.getStats();
      const initialCount = initialStats.staticDataCount;

      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      fallbackService.addStaticBookData(testIsbn, { title: 'Test Book' });

      const newStats = fallbackService.getStats();
      expect(newStats.staticDataCount).toBe(initialCount + 1);
      expect(newStats.availableIsbns).toContain(testIsbn);
    });
  });

  describe('clearStaticData', () => {
    it('should clear all data and reinitialize with defaults', () => {
      // Add a custom book
      const testIsbn = '9781234567890';
      
      fallbackService.addStaticBookData(testIsbn, { title: 'Test Book' });
      
      const statsBeforeClear = fallbackService.getStats();
      expect(statsBeforeClear.availableIsbns).toContain(testIsbn);

      // Clear data - this will call initializeStaticData() again
      fallbackService.clearStaticData();

      // Should have default books but not the custom one
      const statsAfterClear = fallbackService.getStats();
      expect(statsAfterClear.staticDataCount).toBe(3); // Default books
      expect(statsAfterClear.availableIsbns).not.toContain(testIsbn);
      expect(statsAfterClear.availableIsbns).toContain('9780451524935'); // Default book
    });
  });

  describe('convertToTransformedBook', () => {
    it('should convert fallback data with proper description', () => {
      const testIsbn = '9781234567890';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      fallbackService.addStaticBookData(testIsbn, {
        title: 'Test Book',
        source: 'cache',
        confidence: 'low'
      });

      const result = fallbackService.getFallbackBook(testIsbn);
      
      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!.description).toBe('Book information from cache source (low confidence)');
      expect(result!.book!.categories![0]!.name).toBe('General');
      expect(result!.book!.categories![0]!.type).toBe('subject');
    });
  });

  describe('generateMinimalBook', () => {
    it('should generate correct minimal book structure', () => {
      const testIsbn = '9780987654321';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: testIsbn,
      });

      const result = fallbackService.getFallbackBook(testIsbn);

      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe('Book 4321'); // Last 4 digits
      expect(result!.book!.authors).toHaveLength(1);
      expect(result!.book!.authors![0]!.name).toBe('Unknown');
      expect(result!.book!.authors![0]!.surname).toBe('Author');
      expect(result!.book!.categories).toHaveLength(1);
      expect(result!.book!.categories![0]!.name).toBe('Unknown');
      expect(result!.book!.categories![0]!.type).toBe('subject');
    });
  });

  describe('edge cases', () => {
    it('should handle ISBN with different lengths correctly', () => {
      const shortIsbn = '9780123';
      mockValidateIsbn.mockReturnValue({
        isValid: true,
        normalizedIsbn: shortIsbn,
      });

      const result = fallbackService.getFallbackBook(shortIsbn);
      expect(result).toBeDefined();
      expect(result!.book).toBeDefined();
      expect(result!.book!.title).toBe('Book 0123'); // Last 4 digits
    });

    it('should handle multiple calls correctly', () => {
      const testIsbn = '9781111111111';
      
      // Clear mock call history to get accurate count for this test
      mockValidateIsbn.mockClear();
      
      const result1 = fallbackService.getFallbackBook(testIsbn);
      const result2 = fallbackService.getFallbackBook(testIsbn);

      expect(result1).toEqual(result2);
      expect(mockValidateIsbn).toHaveBeenCalledTimes(2);
    });
  });
});