// ================================================================
// tests/controllers/IsbnController.test.ts
// ================================================================

// Mock dependencies - must be before imports
jest.mock('../../../src/utils/isbn', () => ({
  validateIsbn: jest.fn(() => ({
    isValid: true,
    normalizedIsbn: '9780140449136',
  })),
}));
jest.mock('../../../src/services/isbnService');

import { IsbnController } from '../../../src/controllers/IsbnController';
import { isbnService } from '../../../src/services/isbnService';
import { validateIsbn } from '../../../src/utils/isbn';

interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  user?: { userId: number };
}

describe('IsbnController', () => {
  let isbnController: IsbnController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    isbnController = new IsbnController();
    jest.clearAllMocks();

    mockRequest = {};

    // Default mock for validateIsbn
    (validateIsbn as jest.Mock).mockReturnValue({
      isValid: true,
      normalizedIsbn: '9780140449136',
    });
  });

  describe('lookupBook', () => {
    it('should lookup book successfully via path parameter', async () => {
      const mockResult = {
        success: true,
        isbn: '9780140449136',
        book: { title: 'Test Book' },
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.pathParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        isbn: mockResult.isbn,
        book: mockResult.book,
        source: mockResult.source,
        responseTime: mockResult.responseTime,
      });
    });

    it('should lookup book successfully via query parameter', async () => {
      const mockResult = {
        success: true,
        isbn: '9780140449136',
        book: { title: 'Test Book' },
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.queryStringParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
    });

    it('should return 400 when ISBN parameter is missing', async () => {
      const result = await isbnController.lookupBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('ISBN parameter is required');
    });

    it('should return 400 for invalid ISBN', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });

      mockRequest.queryStringParameters = { isbn: 'invalid-isbn' };

      const result = await isbnController.lookupBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 404 when book is not found', async () => {
      const mockResult = {
        success: false,
        isbn: '9780140449136',
        error: 'Book not found',
        source: 'api',
        responseTime: 100,
      };

      (isbnService.lookupBook as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.queryStringParameters = { isbn: '9780140449136' };

      const result = await isbnController.lookupBook(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Book not found');
    });
  });

  describe('batchLookupBooks', () => {
    it('should perform batch lookup successfully', async () => {
      const mockResult = {
        results: {
          '9780140449136': {
            success: true,
            book: { title: 'Book 1' },
            source: 'api',
            responseTime: 100,
          },
          '9780140449143': {
            success: true,
            book: { title: 'Book 2' },
            source: 'cache',
            responseTime: 5,
          },
        },
        summary: {
          total: 2,
          successful: 2,
          failed: 0,
          cached: 1,
          apiCalls: 1,
        },
        errors: [],
      };

      (isbnService.lookupBooks as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.body = JSON.stringify({
        isbns: ['9780140449136', '9780140449143'],
      });

      const result = await isbnController.batchLookupBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.books).toHaveLength(2);
      expect(result.data.summary).toEqual(mockResult.summary);
    });

    it('should return 400 for missing request body', async () => {
      mockRequest.body = undefined;

      const result = await isbnController.batchLookupBooks(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      mockRequest.body = JSON.stringify({
        isbns: [], // Empty array not allowed
      });

      const result = await isbnController.batchLookupBooks(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('searchByTitle', () => {
    it('should search by title successfully', async () => {
      const mockResult = {
        success: true,
        books: [
          {
            title: 'Test Book',
            authors: ['Test Author'],
            isbns: ['9780140449136'],
            publishYear: 2020,
          },
        ],
      };

      (isbnService.searchByTitle as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.queryStringParameters = {
        title: 'Test Book',
        limit: '5',
      };

      const result = await isbnController.searchByTitle(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Book');
      expect(result.data.books).toEqual(mockResult.books);
      expect(result.data.limit).toBe(5);
    });

    it('should return 400 when title parameter is missing', async () => {
      const result = await isbnController.searchByTitle(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Title parameter is required');
    });

    it('should use default limit when not provided', async () => {
      const mockResult = {
        success: true,
        books: [],
      };

      (isbnService.searchByTitle as jest.Mock).mockResolvedValue(mockResult);

      mockRequest.queryStringParameters = { title: 'Test' };

      const result = await isbnController.searchByTitle(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.data.limit).toBe(10); // Default limit
    });
  });

  describe('getServiceHealth', () => {
    it('should return healthy status', async () => {
      const mockHealthResult = {
        available: true,
        responseTime: 150,
        cacheStats: { size: 10, maxSize: 100 },
      };

      (isbnService.checkServiceHealth as jest.Mock).mockResolvedValue(mockHealthResult);

      const result = await isbnController.getServiceHealth(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('healthy');
      expect(result.data.available).toBe(true);
      expect(result.data.responseTime).toBe(150);
    });

    it('should return unhealthy status', async () => {
      const mockHealthResult = {
        available: false,
        error: 'Service unavailable',
        cacheStats: { size: 10, maxSize: 100 },
      };

      (isbnService.checkServiceHealth as jest.Mock).mockResolvedValue(mockHealthResult);

      const result = await isbnController.getServiceHealth(mockRequest);

      expect(result.statusCode).toBe(503);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('unhealthy');
      expect(result.data.available).toBe(false);
      expect(result.data.error).toBe('Service unavailable');
    });
  });

  describe('getResilienceStats', () => {
    it('should return resilience statistics', async () => {
      const mockStats = {
        circuitBreaker: { state: 'CLOSED', failures: 0 },
        fallback: { hits: 5, misses: 10 },
        cache: { size: 50, maxSize: 100 },
        config: { enableCache: true, enableRetry: true },
      };

      (isbnService.getResilienceStats as jest.Mock).mockReturnValue(mockStats);

      const result = await isbnController.getResilienceStats(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.circuitBreaker).toEqual(mockStats.circuitBreaker);
      expect(result.data.config).toEqual(mockStats.config);
    });
  });

  describe('resetResilience', () => {
    it('should reset resilience mechanisms', async () => {
      (isbnService.resetResilience as jest.Mock).mockReturnValue(undefined);

      const result = await isbnController.resetResilience(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Resilience mechanisms reset successfully');
      expect(isbnService.resetResilience).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      (isbnService.clearCache as jest.Mock).mockReturnValue(undefined);

      const result = await isbnController.clearCache(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('ISBN service cache cleared successfully');
      expect(isbnService.clearCache).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        size: 50,
        maxSize: 100,
        hitRate: 0.85,
      };

      (isbnService.getCacheStats as jest.Mock).mockReturnValue(mockStats);

      const result = await isbnController.getCacheStats(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.size).toBe(50);
      expect(result.data.maxSize).toBe(100);
    });
  });

  describe('addFallbackBook', () => {
    it('should add fallback book successfully', async () => {
      (isbnService.addFallbackBook as jest.Mock).mockReturnValue(true);

      mockRequest.body = JSON.stringify({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });

      const result = await isbnController.addFallbackBook(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Fallback book added successfully');
      expect(result.data).toEqual({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });
    });

    it('should return 400 when fallback addition fails', async () => {
      (isbnService.addFallbackBook as jest.Mock).mockReturnValue(false);

      mockRequest.body = JSON.stringify({
        isbn: '9780140449136',
        title: 'Fallback Book',
      });

      const result = await isbnController.addFallbackBook(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add fallback book');
    });
  });

  describe('validateIsbn', () => {
    it('should validate ISBN successfully', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockRequest.queryStringParameters = { isbn: '978-0-14-044913-6' };

      const result = await isbnController.validateIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(true);
      expect(result.data.normalizedIsbn).toBe('9780140449136');
      expect(result.data.details.format).toBe('ISBN-13');
    });

    it('should handle invalid ISBN', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Invalid format',
      });

      mockRequest.queryStringParameters = { isbn: 'invalid' };

      const result = await isbnController.validateIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.error).toBe('Invalid format');
    });
  });

  describe('formatIsbn', () => {
    it('should format ISBN as hyphenated', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockRequest.queryStringParameters = {
        isbn: '9780140449136',
        format: 'hyphenated',
      };

      const result = await isbnController.formatIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.format).toBe('hyphenated');
      expect(result.data.formattedIsbn).toMatch(/\d{3}-\d-\d{2}-\d{6}-\d/);
    });

    it('should convert ISBN-13 to ISBN-10', async () => {
      (validateIsbn as jest.Mock).mockReturnValue({
        isValid: true,
        normalizedIsbn: '9780140449136',
      });

      mockRequest.queryStringParameters = {
        isbn: '9780140449136',
        format: 'isbn10',
      };

      const result = await isbnController.formatIsbn(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.format).toBe('isbn10');
      expect(result.data.formattedIsbn).toHaveLength(10);
    });

    it('should return 400 for invalid format', async () => {
      mockRequest.queryStringParameters = {
        isbn: '9780140449136',
        format: 'invalid',
      };

      const result = await isbnController.formatIsbn(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Format must be one of');
    });
  });
});