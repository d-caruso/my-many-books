// ================================================================
// tests/utils/constants.test.ts  
// Tests for constants utility
// ================================================================

import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  BOOK_STATUS,
  API_ENDPOINTS,
  DATABASE_CONFIG,
  PAGINATION_DEFAULTS,
  TABLE_NAMES,
  VALIDATION_RULES,
  ISBN_CONSTANTS,
  ISBN_ERROR_MESSAGES
} from '../../../src/utils/constants';

describe('Constants', () => {
  describe('HTTP_STATUS', () => {
    it('should have correct HTTP status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.CREATED).toBe(201);
      expect(HTTP_STATUS.NO_CONTENT).toBe(204);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.UNAUTHORIZED).toBe(401);
      expect(HTTP_STATUS.FORBIDDEN).toBe(403);
      expect(HTTP_STATUS.NOT_FOUND).toBe(404);
      expect(HTTP_STATUS.CONFLICT).toBe(409);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(HTTP_STATUS)).toBe(true);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have correct error messages', () => {
      expect(ERROR_MESSAGES.BOOK_NOT_FOUND).toBe('Book not found');
      expect(ERROR_MESSAGES.BOOK_ALREADY_EXISTS).toBe('Book with this ISBN already exists');
      expect(ERROR_MESSAGES.INVALID_REQUEST_BODY).toBe('Invalid request body');
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBe('Database operation failed');
      expect(ERROR_MESSAGES.EXTERNAL_API_ERROR).toBe('External API request failed');
      expect(ERROR_MESSAGES.INVALID_BOOK_STATUS).toBe('Invalid book status');
      expect(ERROR_MESSAGES.CONNECTION_ERROR).toBe('Database connection failed');
      expect(ERROR_MESSAGES.MISSING_REQUIRED_FIELDS).toBe('Missing required fields');
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(ERROR_MESSAGES)).toBe(true);
    });
  });

  describe('BOOK_STATUS', () => {
    it('should have correct book status values', () => {
      expect(BOOK_STATUS.IN_PROGRESS).toBe('in progress');
      expect(BOOK_STATUS.PAUSED).toBe('paused');
      expect(BOOK_STATUS.FINISHED).toBe('finished');
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(BOOK_STATUS)).toBe(true);
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should have correct API endpoints', () => {
      expect(API_ENDPOINTS.OPEN_LIBRARY).toBe('https://openlibrary.org/api/books');
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(API_ENDPOINTS)).toBe(true);
    });
  });

  describe('DATABASE_CONFIG', () => {
    it('should have correct database configuration', () => {
      expect(DATABASE_CONFIG.DIALECT).toBe('mysql');
      expect(DATABASE_CONFIG.TIMEZONE).toBe('+00:00');
      expect(DATABASE_CONFIG.POOL.max).toBe(5);
      expect(DATABASE_CONFIG.POOL.min).toBe(0);
      expect(DATABASE_CONFIG.POOL.acquire).toBe(30000);
      expect(DATABASE_CONFIG.POOL.idle).toBe(10000);
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(DATABASE_CONFIG)).toBe(true);
      expect(Object.isFrozen(DATABASE_CONFIG.POOL)).toBe(true);
    });
  });

  describe('PAGINATION_DEFAULTS', () => {
    it('should have correct pagination defaults', () => {
      expect(PAGINATION_DEFAULTS.PAGE).toBe(1);
      expect(PAGINATION_DEFAULTS.LIMIT).toBe(20);
      expect(PAGINATION_DEFAULTS.MAX_LIMIT).toBe(100);
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(PAGINATION_DEFAULTS)).toBe(true);
    });
  });

  describe('TABLE_NAMES', () => {
    it('should have correct table names', () => {
      expect(TABLE_NAMES.BOOKS).toBe('books');
      expect(TABLE_NAMES.AUTHORS).toBe('authors');
      expect(TABLE_NAMES.CATEGORIES).toBe('categories');
      expect(TABLE_NAMES.BOOK_AUTHORS).toBe('book_authors');
      expect(TABLE_NAMES.BOOK_CATEGORIES).toBe('book_categories');
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(TABLE_NAMES)).toBe(true);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should have correct validation rules', () => {
      expect(VALIDATION_RULES.ISBN.MIN_LENGTH).toBe(10);
      expect(VALIDATION_RULES.ISBN.MAX_LENGTH).toBe(13);
      expect(VALIDATION_RULES.TITLE.MIN_LENGTH).toBe(1);
      expect(VALIDATION_RULES.TITLE.MAX_LENGTH).toBe(255);
      expect(VALIDATION_RULES.AUTHOR_NAME.MIN_LENGTH).toBe(1);
      expect(VALIDATION_RULES.AUTHOR_NAME.MAX_LENGTH).toBe(255);
      expect(VALIDATION_RULES.CATEGORY_NAME.MIN_LENGTH).toBe(1);
      expect(VALIDATION_RULES.CATEGORY_NAME.MAX_LENGTH).toBe(255);
      expect(VALIDATION_RULES.NOTES.MAX_LENGTH).toBe(2000);
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(VALIDATION_RULES)).toBe(true);
      expect(Object.isFrozen(VALIDATION_RULES.ISBN)).toBe(true);
      expect(Object.isFrozen(VALIDATION_RULES.TITLE)).toBe(true);
      expect(Object.isFrozen(VALIDATION_RULES.AUTHOR_NAME)).toBe(true);
      expect(Object.isFrozen(VALIDATION_RULES.CATEGORY_NAME)).toBe(true);
      expect(Object.isFrozen(VALIDATION_RULES.NOTES)).toBe(true);
    });
  });

  describe('ISBN_CONSTANTS', () => {
    it('should have correct ISBN constants', () => {
      expect(ISBN_CONSTANTS.ISBN_10_LENGTH).toBe(10);
      expect(ISBN_CONSTANTS.ISBN_13_LENGTH).toBe(13);
      expect(ISBN_CONSTANTS.VALID_PREFIXES).toEqual(['978', '979']);
    });

    it('should have correct regex patterns', () => {
      expect(ISBN_CONSTANTS.REGEX.DIGITS_ONLY).toBeInstanceOf(RegExp);
      expect(ISBN_CONSTANTS.REGEX.ISBN_10).toBeInstanceOf(RegExp);
      expect(ISBN_CONSTANTS.REGEX.ISBN_13).toBeInstanceOf(RegExp);
      expect(ISBN_CONSTANTS.REGEX.EXTRACT_13).toBeInstanceOf(RegExp);
      expect(ISBN_CONSTANTS.REGEX.EXTRACT_10).toBeInstanceOf(RegExp);
    });

    it('should validate regex patterns work correctly', () => {
      expect(ISBN_CONSTANTS.REGEX.DIGITS_ONLY.test('123456789')).toBe(true);
      expect(ISBN_CONSTANTS.REGEX.DIGITS_ONLY.test('12345abc')).toBe(false);
      
      expect(ISBN_CONSTANTS.REGEX.ISBN_10.test('123456789X')).toBe(true);
      expect(ISBN_CONSTANTS.REGEX.ISBN_10.test('1234567890')).toBe(true);
      expect(ISBN_CONSTANTS.REGEX.ISBN_10.test('12345')).toBe(false);
      
      expect(ISBN_CONSTANTS.REGEX.ISBN_13.test('9781234567890')).toBe(true);
      expect(ISBN_CONSTANTS.REGEX.ISBN_13.test('123456789')).toBe(false);
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(ISBN_CONSTANTS)).toBe(true);
      expect(Object.isFrozen(ISBN_CONSTANTS.VALID_PREFIXES)).toBe(true);
      expect(Object.isFrozen(ISBN_CONSTANTS.REGEX)).toBe(true);
    });
  });

  describe('ISBN_ERROR_MESSAGES', () => {
    it('should have correct ISBN error messages', () => {
      expect(ISBN_ERROR_MESSAGES.INVALID_ISBN_LENGTH).toBe('Invalid ISBN length');
      expect(ISBN_ERROR_MESSAGES.NO_VALID_ISBN_FOUND).toBe('No valid ISBN found');
      expect(ISBN_ERROR_MESSAGES.EXPECTED_LENGTH).toBe('Expected 10 or 13 digits');
      expect(ISBN_ERROR_MESSAGES.ISBN_REQUIRED).toBe('ISBN is required');
      expect(ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_10_CHAR).toBe('ISBN-10 must be exactly 10 characters');
      expect(ISBN_ERROR_MESSAGES.ISBN_13_MUST_BE_13_CHAR).toBe('ISBN-13 must be exactly 13 characters');
      expect(ISBN_ERROR_MESSAGES.ISBN_10_MUST_BE_DIGITS).toBe('First 9 characters of ISBN-10 must be digits');
      expect(ISBN_ERROR_MESSAGES.ISBN_10_LAST_CHAR).toBe('Last character of ISBN-10 must be a digit or X');
      expect(ISBN_ERROR_MESSAGES.ISBN_13_PREFIX).toBe('ISBN-13 must start with 978 or 979');
      expect(ISBN_ERROR_MESSAGES.ISBN_13_DIGITS_ONLY).toBe('ISBN-13 must contain only digits');
      expect(ISBN_ERROR_MESSAGES.ISBN_10_INVALID_CHECKSUM).toBe('Invalid ISBN-10 checksum');
      expect(ISBN_ERROR_MESSAGES.ISBN_13_INVALID_CHECKSUM).toBe('Invalid ISBN-13 checksum');
    });

    it('should be frozen/immutable', () => {
      expect(Object.isFrozen(ISBN_ERROR_MESSAGES)).toBe(true);
    });
  });

  describe('Type safety', () => {
    it('should maintain const assertions for all constants', () => {
      // These should not throw TypeScript errors if const assertions work
      const status: 200 = HTTP_STATUS.OK;
      const bookStatus: 'finished' = BOOK_STATUS.FINISHED;
      const tableName: 'books' = TABLE_NAMES.BOOKS;
      
      expect(status).toBe(200);
      expect(bookStatus).toBe('finished');
      expect(tableName).toBe('books');
    });
  });

  describe('Constants completeness', () => {
    it('should have all HTTP status codes needed', () => {
      const statusCodes = Object.values(HTTP_STATUS);
      expect(statusCodes).toContain(200);
      expect(statusCodes).toContain(201);
      expect(statusCodes).toContain(204);
      expect(statusCodes).toContain(400);
      expect(statusCodes).toContain(401);
      expect(statusCodes).toContain(403);
      expect(statusCodes).toContain(404);
      expect(statusCodes).toContain(409);
      expect(statusCodes).toContain(500);
    });

    it('should have all book status values', () => {
      const statuses = Object.values(BOOK_STATUS);
      expect(statuses).toContain('in progress');
      expect(statuses).toContain('paused');
      expect(statuses).toContain('finished');
      expect(statuses).toHaveLength(3);
    });

    it('should have all required table names', () => {
      const tableNames = Object.values(TABLE_NAMES);
      expect(tableNames).toContain('books');
      expect(tableNames).toContain('authors');
      expect(tableNames).toContain('categories');
      expect(tableNames).toContain('book_authors');
      expect(tableNames).toContain('book_categories');
      expect(tableNames).toHaveLength(5);
    });
  });
});