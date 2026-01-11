import { isRetriableError } from '../../src/services/QueueExecutor';
import { ApiError, ErrorCode } from '../../src/types/errors';

describe('isRetriableError with ApiError support', () => {
  describe('ApiError Handling', () => {
    it('should identify retriable ApiErrors', () => {
      const networkError = new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true);
      const timeoutError = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Connection timeout', undefined, true);
      const serverError = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Internal Server Error', 500, true);
      
      expect(isRetriableError(networkError)).toBe(true);
      expect(isRetriableError(timeoutError)).toBe(true);
      expect(isRetriableError(serverError)).toBe(true);
    });

    it('should identify non-retriable ApiErrors', () => {
      const validationError = new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid data', undefined, false);
      const authError = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized', 401, false);
      const notFoundError = new ApiError(ErrorCode.HTTP_NOT_FOUND, 'Resource not found', 404, false);
      
      expect(isRetriableError(validationError)).toBe(false);
      expect(isRetriableError(authError)).toBe(false);
      expect(isRetriableError(notFoundError)).toBe(false);
    });
  });

  describe('Legacy HTTP Error Handling', () => {
    it('should identify retriable HTTP status codes', () => {
      expect(isRetriableError({ status: 500 })).toBe(true);
      expect(isRetriableError({ status: 502 })).toBe(true);
      expect(isRetriableError({ status: 408 })).toBe(true);
      expect(isRetriableError({ status: 429 })).toBe(true);
    });

    it('should identify retriable HTTP error messages', () => {
      expect(isRetriableError(new Error('HTTP 500: Internal Server Error'))).toBe(true);
      expect(isRetriableError(new Error('HTTP 502: Bad Gateway'))).toBe(true);
      expect(isRetriableError(new Error('HTTP 408: Request Timeout'))).toBe(true);
      expect(isRetriableError(new Error('HTTP 429: Too Many Requests'))).toBe(true);
    });

    it('should treat non-retriable legacy errors as non-retriable', () => {
      const networkError = new Error('Network request failed'); // No HTTP pattern
      const timeoutError = new Error('Connection timeout'); // No HTTP pattern
      const offlineError = new Error('Network is offline'); // No HTTP pattern
      const validationError = { message: 'Bad Request', status: 400 };
      
      expect(isRetriableError(networkError)).toBe(false);
      expect(isRetriableError(timeoutError)).toBe(false);
      expect(isRetriableError(offlineError)).toBe(false);
      expect(isRetriableError(validationError)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined errors', () => {
      expect(isRetriableError(null)).toBe(false);
      expect(isRetriableError(undefined)).toBe(false);
    });

    it('should handle empty objects and strings', () => {
      expect(isRetriableError({})).toBe(false);
      expect(isRetriableError('')).toBe(false);
      expect(isRetriableError('error string')).toBe(false);
    });
  });
});