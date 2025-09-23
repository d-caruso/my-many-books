// ================================================================
// src/controllers/IsbnController.ts
// ================================================================

import Joi from 'joi';
import { BaseController } from './base/BaseController';
import { isbnService } from '../services/isbnService';
import { validateIsbn } from '../utils/isbn';
import { ApiResponse } from '../common/ApiResponse';

// A universal request interface to decouple the controller from the framework
import { UniversalRequest } from '../types';

/*interface UniversalRequest {
  body?: unknown;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
}*/

interface IsbnLookupRequest {
  isbn: string;
}

interface BatchIsbnLookupRequest {
  isbns: string[];
}

interface TitleSearchRequest {
  title: string;
  limit?: number;
}

interface AddFallbackBookRequest {
  isbn: string;
  title: string;
}

export class IsbnController extends BaseController {
  private readonly isbnLookupSchema = Joi.object<IsbnLookupRequest>({
    isbn: Joi.string().required().custom(this.validateIsbnField.bind(this)),
  });

  private readonly batchIsbnLookupSchema = Joi.object<BatchIsbnLookupRequest>({
    isbns: Joi.array()
      .items(Joi.string().custom(this.validateIsbnField.bind(this)))
      .min(1)
      .max(50)
      .required(),
  });

  private readonly titleSearchSchema = Joi.object<TitleSearchRequest>({
    title: Joi.string().required().min(2).max(200).trim(),
    limit: Joi.number().integer().min(1).max(100).optional().default(10),
  });

  private readonly addFallbackBookSchema = Joi.object<AddFallbackBookRequest>({
    isbn: Joi.string().required().custom(this.validateIsbnField.bind(this)),
    title: Joi.string().required().min(1).max(500).trim(),
  });

  private validateIsbnField(value: string, helpers: Joi.CustomHelpers): unknown {
    const validation = validateIsbn(value);
    if (!validation.isValid) {
      return helpers.error('any.invalid', { message: `Invalid ISBN: ${validation.error}` });
    }
    return validation.normalizedIsbn;
  }

  async lookupBook(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const isbn =
        this.getPathParameter(request, 'isbn') || this.getQueryParameter(request, 'isbn');

      if (!isbn) {
        return this.createErrorResponse('ISBN parameter is required', 400);
      }

      const validation = this.validateRequest({ isbn }, this.isbnLookupSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const normalizedIsbn = validation.value!.isbn;

      const result = await isbnService.lookupBook(normalizedIsbn);

      if (result.success) {
        return this.createSuccessResponse({
          isbn: result.isbn,
          book: result.book,
          source: result.source,
          responseTime: result.responseTime,
        });
      } else {
        return this.createErrorResponse(result.error || 'Book not found', 404, {
          isbn: result.isbn,
          source: result.source,
          responseTime: result.responseTime,
        });
      }
    } catch (error) {
      console.error('ISBN lookup error:', error);
      return this.createErrorResponse('Internal server error during ISBN lookup', 500);
    }
  }

  async batchLookupBooks(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const body = this.parseBody<BatchIsbnLookupRequest>(request);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.batchIsbnLookupSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const { isbns } = validation.value!;

      const result = await isbnService.lookupBooks(isbns);

      // Transform results for consistent API response
      const books = Object.entries(result.results).map(([isbn, bookResult]) => ({
        isbn,
        success: bookResult.success,
        book: bookResult.book || null,
        error: bookResult.error || null,
        source: bookResult.source,
        responseTime: bookResult.responseTime,
      }));

      return this.createSuccessResponse({
        books,
        summary: result.summary,
        errors: result.errors,
      });
    } catch (error) {
      console.error('Batch ISBN lookup error:', error);
      return this.createErrorResponse('Internal server error during batch ISBN lookup', 500);
    }
  }

  async searchByTitle(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const title = this.getQueryParameter(request, 'title');
      const limitParam = this.getQueryParameter(request, 'limit');

      if (!title) {
        return this.createErrorResponse('Title parameter is required', 400);
      }

      const searchData: TitleSearchRequest = {
        title,
        limit: limitParam ? parseInt(limitParam, 10) : 10,
      };

      const validation = this.validateRequest(searchData, this.titleSearchSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const { title: searchTitle, limit } = validation.value!;

      const result = await isbnService.searchByTitle(searchTitle, limit);

      if (result.success) {
        return this.createSuccessResponse({
          title: searchTitle,
          books: result.books || [],
          totalFound: (result.books || []).length,
          limit,
        });
      } else {
        return this.createErrorResponse(result.error || 'Search failed', 400);
      }
    } catch (error) {
      console.error('Title search error:', error);
      return this.createErrorResponse('Internal server error during title search', 500);
    }
  }

  async getServiceHealth(_request: UniversalRequest): Promise<ApiResponse> {
    try {
      const healthResult = await isbnService.checkServiceHealth();

      const status = healthResult.available ? 'healthy' : 'unhealthy';
      const statusCode = healthResult.available ? 200 : 503;

      return this.createSuccessResponse(
        {
          status,
          available: healthResult.available,
          responseTime: healthResult.responseTime,
          error: healthResult.error,
          cacheStats: healthResult.cacheStats,
          timestamp: new Date().toISOString(),
        },
        undefined,
        undefined,
        statusCode
      );
    } catch (error) {
      console.error('Health check error:', error);
      return this.createErrorResponse('Health check failed', 503);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getResilienceStats(_request: UniversalRequest): Promise<ApiResponse> {
    try {
      const stats = isbnService.getResilienceStats();

      return this.createSuccessResponse({
        circuitBreaker: stats.circuitBreaker,
        fallback: stats.fallback,
        cache: stats.cache,
        config: stats.config,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Resilience stats error:', error);
      return this.createErrorResponse('Failed to get resilience statistics', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async resetResilience(_request: UniversalRequest): Promise<ApiResponse> {
    try {
      isbnService.resetResilience();

      return this.createSuccessResponse(null, 'Resilience mechanisms reset successfully');
    } catch (error) {
      console.error('Reset resilience error:', error);
      return this.createErrorResponse('Failed to reset resilience mechanisms', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async clearCache(_request: UniversalRequest): Promise<ApiResponse> {
    try {
      isbnService.clearCache();

      return this.createSuccessResponse(null, 'ISBN service cache cleared successfully');
    } catch (error) {
      console.error('Clear cache error:', error);
      return this.createErrorResponse('Failed to clear cache', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getCacheStats(_request: UniversalRequest): Promise<ApiResponse> {
    try {
      const cacheStats = isbnService.getCacheStats();

      return this.createSuccessResponse({
        ...cacheStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Cache stats error:', error);
      return this.createErrorResponse('Failed to get cache statistics', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async addFallbackBook(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const body = this.parseBody<AddFallbackBookRequest>(request);
      if (!body) {
        return this.createErrorResponse('Request body is required', 400);
      }

      const validation = this.validateRequest(body, this.addFallbackBookSchema);
      if (!validation.isValid) {
        return this.createErrorResponse('Validation failed', 400, validation.errors);
      }

      const { isbn, title } = validation.value!;

      const success = isbnService.addFallbackBook(isbn, title);

      if (success) {
        return this.createSuccessResponse(
          { isbn, title },
          'Fallback book added successfully',
          undefined,
          201
        );
      } else {
        return this.createErrorResponse('Failed to add fallback book', 400);
      }
    } catch (error) {
      console.error('Add fallback book error:', error);
      return this.createErrorResponse('Internal server error while adding fallback book', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateIsbn(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const isbn =
        this.getPathParameter(request, 'isbn') || this.getQueryParameter(request, 'isbn');

      if (!isbn) {
        return this.createErrorResponse('ISBN parameter is required', 400);
      }

      const validation = validateIsbn(isbn);

      return this.createSuccessResponse({
        originalIsbn: isbn,
        isValid: validation.isValid,
        normalizedIsbn: validation.normalizedIsbn,
        error: validation.error,
        details: {
          length: isbn.length,
          hasCheckDigit: isbn.length >= 10,
          format: validation.normalizedIsbn
            ? validation.normalizedIsbn.length === 10
              ? 'ISBN-10'
              : 'ISBN-13'
            : 'unknown',
        },
      });
    } catch (error) {
      console.error('ISBN validation error:', error);
      return this.createErrorResponse('Internal server error during ISBN validation', 500);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async formatIsbn(request: UniversalRequest): Promise<ApiResponse> {
    try {
      const isbn = this.getQueryParameter(request, 'isbn');
      const format = this.getQueryParameter(request, 'format') || 'hyphenated';

      if (!isbn) {
        return this.createErrorResponse('ISBN parameter is required', 400);
      }

      if (!['hyphenated', 'clean', 'isbn10', 'isbn13'].includes(format)) {
        return this.createErrorResponse(
          'Format must be one of: hyphenated, clean, isbn10, isbn13',
          400
        );
      }

      const validation = validateIsbn(isbn);

      if (!validation.isValid) {
        return this.createErrorResponse(`Invalid ISBN: ${validation.error}`, 400);
      }

      const normalizedIsbn = validation.normalizedIsbn!;
      let formattedIsbn: string;

      switch (format) {
        case 'hyphenated':
          // Basic hyphenation (this is simplified - real ISBN hyphenation requires
          // publisher and title identifier ranges)
          if (normalizedIsbn.length === 13) {
            formattedIsbn = `${normalizedIsbn.slice(0, 3)}-${normalizedIsbn.slice(3, 4)}-${normalizedIsbn.slice(4, 6)}-${normalizedIsbn.slice(6, 12)}-${normalizedIsbn.slice(12)}`;
          } else {
            formattedIsbn = `${normalizedIsbn.slice(0, 1)}-${normalizedIsbn.slice(1, 3)}-${normalizedIsbn.slice(3, 9)}-${normalizedIsbn.slice(9)}`;
          }
          break;
        case 'clean':
          formattedIsbn = normalizedIsbn;
          break;
        case 'isbn10':
          if (normalizedIsbn.length === 13 && normalizedIsbn.startsWith('978')) {
            // Convert ISBN-13 to ISBN-10
            const isbn10Base = normalizedIsbn.slice(3, 12);
            let checksum = 0;
            for (let i = 0; i < 9; i++) {
              checksum += parseInt(isbn10Base[i]!) * (10 - i);
            }
            const checkDigit = (11 - (checksum % 11)) % 11;
            formattedIsbn = isbn10Base + (checkDigit === 10 ? 'X' : checkDigit.toString());
          } else if (normalizedIsbn.length === 10) {
            formattedIsbn = normalizedIsbn;
          } else {
            return this.createErrorResponse('Cannot convert this ISBN to ISBN-10 format', 400);
          }
          break;
        case 'isbn13':
          if (normalizedIsbn.length === 10) {
            // Convert ISBN-10 to ISBN-13
            const isbn13Base = '978' + normalizedIsbn.slice(0, 9);
            let checksum = 0;
            for (let i = 0; i < 12; i++) {
              checksum += parseInt(isbn13Base[i]!) * (i % 2 === 0 ? 1 : 3);
            }
            const checkDigit = (10 - (checksum % 10)) % 10;
            formattedIsbn = isbn13Base + checkDigit.toString();
          } else {
            formattedIsbn = normalizedIsbn;
          }
          break;
        default:
          formattedIsbn = normalizedIsbn;
      }

      return this.createSuccessResponse({
        originalIsbn: isbn,
        normalizedIsbn,
        formattedIsbn,
        format,
      });
    } catch (error) {
      console.error('ISBN formatting error:', error);
      return this.createErrorResponse('Internal server error during ISBN formatting', 500);
    }
  }
}

export const isbnController = new IsbnController();
