// Test for QueueExecutor retriable vs non-retriable error handling
import { isRetriableError } from '../../src/services/QueueExecutor';
import { ApiError, ErrorCode } from '../../src/types/errors';

describe('QueueExecutor', () => {
  describe('isRetriableError', () => {
    describe('ApiError Retriable Handling', () => {
      it('should identify retriable ApiErrors correctly', () => {
        expect(isRetriableError(new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true))).toBe(true);
        expect(isRetriableError(new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Request timeout', undefined, true))).toBe(true);
        expect(isRetriableError(new ApiError(ErrorCode.NETWORK_OFFLINE, 'You are offline', undefined, true))).toBe(true);
        expect(isRetriableError(new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Internal Server Error', 500, true))).toBe(true);
        expect(isRetriableError(new ApiError(ErrorCode.RATE_LIMITED, 'Too Many Requests', 429, true))).toBe(true);
      });

      it('should identify non-retriable ApiErrors correctly', () => {
        expect(isRetriableError(new ApiError(ErrorCode.VALIDATION_ERROR, 'Invalid data', undefined, false))).toBe(false);
        expect(isRetriableError(new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized', 401, false))).toBe(false);
        expect(isRetriableError(new ApiError(ErrorCode.HTTP_NOT_FOUND, 'Resource not found', 404, false))).toBe(false);
        expect(isRetriableError(new ApiError(ErrorCode.HTTP_CLIENT_ERROR, 'Bad request', 400, false))).toBe(false);
      });
    });

    describe('Legacy HTTP Error Handling', () => {
      it('should identify retriable HTTP errors', () => {
        expect(isRetriableError({ status: 500 })).toBe(true);
        expect(isRetriableError({ status: 408 })).toBe(true);
        expect(isRetriableError({ status: 429 })).toBe(true);
        expect(isRetriableError(new Error('HTTP 500: Server Error'))).toBe(true);
        expect(isRetriableError(new Error('HTTP 408: Request Timeout'))).toBe(true);
        expect(isRetriableError(new Error('HTTP 429: Too Many Requests'))).toBe(true);
      });

      it('should treat non-HTTP errors as non-retriable', () => {
        expect(isRetriableError(new Error('Network request failed'))).toBe(false);
        expect(isRetriableError({ message: 'timeout' })).toBe(false);
        expect(isRetriableError({ name: 'AbortError' })).toBe(false);
        expect(isRetriableError('string error')).toBe(false);
        expect(isRetriableError({ status: 400 })).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null/undefined errors', () => {
        expect(isRetriableError(null)).toBe(false);
        expect(isRetriableError(undefined)).toBe(false);
        expect(isRetriableError('')).toBe(false);
      });
    });
  });
});