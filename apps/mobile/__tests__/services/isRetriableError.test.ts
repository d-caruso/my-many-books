/**
 * Tests for isRetriableError function with ApiError support
 */

import { isRetriableError } from '../../src/services/QueueExecutor';
import { ApiError, ErrorCode } from '../../src/types/errors';

describe('isRetriableError with ApiError support', () => {
  describe('ApiError instances', () => {
    it('should return true for retriable ApiError', () => {
      const networkTimeout = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout');
      const networkOffline = new ApiError(ErrorCode.NETWORK_OFFLINE, 'Offline');
      const networkFailed = new ApiError(ErrorCode.NETWORK_FAILED, 'Network failed');
      const serverError = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Server error', 500);
      const rateLimited = new ApiError(ErrorCode.RATE_LIMITED, 'Rate limited', 429);
      
      expect(isRetriableError(networkTimeout)).toBe(true);
      expect(isRetriableError(networkOffline)).toBe(true);
      expect(isRetriableError(networkFailed)).toBe(true);
      expect(isRetriableError(serverError)).toBe(true);
      expect(isRetriableError(rateLimited)).toBe(true);
    });

    it('should return false for non-retriable ApiError', () => {
      const unauthorized = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized', 401);
      const forbidden = new ApiError(ErrorCode.HTTP_FORBIDDEN, 'Forbidden', 403);
      const notFound = new ApiError(ErrorCode.HTTP_NOT_FOUND, 'Not found', 404);
      const clientError = new ApiError(ErrorCode.HTTP_CLIENT_ERROR, 'Client error', 400);
      const validation = new ApiError(ErrorCode.VALIDATION_ERROR, 'Validation failed');
      
      expect(isRetriableError(unauthorized)).toBe(false);
      expect(isRetriableError(forbidden)).toBe(false);
      expect(isRetriableError(notFound)).toBe(false);
      expect(isRetriableError(clientError)).toBe(false);
      expect(isRetriableError(validation)).toBe(false);
    });

    it('should respect explicit retriable override', () => {
      const overriddenRetriable = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized', 401, true);
      const overriddenNonRetriable = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout', undefined, false);
      
      expect(isRetriableError(overriddenRetriable)).toBe(true);
      expect(isRetriableError(overriddenNonRetriable)).toBe(false);
    });
  });

  describe('Legacy Error fallback', () => {
    it('should handle null/undefined errors', () => {
      expect(isRetriableError(null)).toBe(false);
      expect(isRetriableError(undefined)).toBe(false);
    });

    it('should detect network request failed errors', () => {
      const networkError = new Error('Network request failed');
      expect(isRetriableError(networkError)).toBe(true);
    });

    it('should detect timeout errors', () => {
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      const timeoutError = new Error('Connection timeout');
      
      expect(isRetriableError(abortError)).toBe(true);
      expect(isRetriableError(timeoutError)).toBe(true);
    });

    it('should detect offline errors', () => {
      const offlineError1 = new Error('You are offline');
      const offlineError2 = new Error('no connection available');
      const offlineError3 = new Error('Network is offline');
      
      expect(isRetriableError(offlineError1)).toBe(true);
      expect(isRetriableError(offlineError2)).toBe(true);
      expect(isRetriableError(offlineError3)).toBe(true);
    });

    it('should detect HTTP 5xx server errors', () => {
      const error500 = new Error('HTTP 500: Internal Server Error');
      const error502 = new Error('HTTP 502: Bad Gateway');
      const error503 = new Error('HTTP 503: Service Unavailable');
      const error504 = new Error('HTTP 504: Gateway Timeout');
      const error599 = new Error('HTTP 599: Network Connect Timeout');
      
      expect(isRetriableError(error500)).toBe(true);
      expect(isRetriableError(error502)).toBe(true);
      expect(isRetriableError(error503)).toBe(true);
      expect(isRetriableError(error504)).toBe(true);
      expect(isRetriableError(error599)).toBe(true);
    });

    it('should detect HTTP 408 and 429 as retriable', () => {
      const timeout408 = new Error('HTTP 408: Request Timeout');
      const timeout408Alt = new Error('Request Timeout occurred');
      const rateLimited = new Error('HTTP 429: Too Many Requests');
      
      expect(isRetriableError(timeout408)).toBe(true);
      expect(isRetriableError(timeout408Alt)).toBe(true);
      expect(isRetriableError(rateLimited)).toBe(true);
    });

    it('should detect errors with status property', () => {
      const errorWithStatus500 = { message: 'Server error', status: 500 };
      const errorWithStatus408 = { message: 'Timeout', status: 408 };
      const errorWithStatus429 = { message: 'Rate limited', status: 429 };
      const errorWithStatus400 = { message: 'Bad request', status: 400 };
      const errorWithStatus401 = { message: 'Unauthorized', status: 401 };
      
      expect(isRetriableError(errorWithStatus500)).toBe(true);
      expect(isRetriableError(errorWithStatus408)).toBe(true);
      expect(isRetriableError(errorWithStatus429)).toBe(true);
      expect(isRetriableError(errorWithStatus400)).toBe(false);
      expect(isRetriableError(errorWithStatus401)).toBe(false);
    });

    it('should return false for non-retriable generic errors', () => {
      const validationError = new Error('Invalid input data');
      const authError = new Error('Authentication failed');
      const notFoundError = new Error('Resource not found');
      const emptyError = new Error('');
      
      expect(isRetriableError(validationError)).toBe(false);
      expect(isRetriableError(authError)).toBe(false);
      expect(isRetriableError(notFoundError)).toBe(false);
      expect(isRetriableError(emptyError)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isRetriableError({})).toBe(false);
      expect(isRetriableError('string error')).toBe(false);
      expect(isRetriableError(123)).toBe(false);
      expect(isRetriableError([])).toBe(false);
    });

    it('should handle edge cases with status property', () => {
      const stringStatus = { status: '500' }; // String status should still work
      const invalidStatus = { status: 'error' };
      const zeroStatus = { status: 0 };
      
      expect(isRetriableError(stringStatus)).toBe(true); // '500' >= 500 is true
      expect(isRetriableError(invalidStatus)).toBe(false);
      expect(isRetriableError(zeroStatus)).toBe(false);
    });

    it('should be case sensitive for message matching', () => {
      const upperCaseNetwork = new Error('NETWORK REQUEST FAILED');
      const upperCaseOffline = new Error('OFFLINE');
      const upperCaseTimeout = new Error('TIMEOUT');
      
      expect(isRetriableError(upperCaseNetwork)).toBe(false);
      expect(isRetriableError(upperCaseOffline)).toBe(false);
      expect(isRetriableError(upperCaseTimeout)).toBe(false);
    });
  });

  describe('Mixed error scenarios', () => {
    it('should prioritize ApiError over legacy checking', () => {
      // ApiError with retriable=false but message that would trigger legacy fallback
      const apiError = new ApiError(ErrorCode.VALIDATION_ERROR, 'Network request failed timeout offline', undefined, false);
      
      // Should return false because ApiError.retriable=false, ignoring the message content
      expect(isRetriableError(apiError)).toBe(false);
    });

    it('should handle realistic error scenarios from FetchHttpClient', () => {
      const fetchTimeout = new Error('Request timeout');
      fetchTimeout.name = 'AbortError';
      
      const fetchNetworkError = new Error('Network request failed');
      const fetchOfflineError = new Error('no connection available');
      const fetchServerError = new Error('HTTP 503: Service Unavailable');
      
      expect(isRetriableError(fetchTimeout)).toBe(true);
      expect(isRetriableError(fetchNetworkError)).toBe(true);
      expect(isRetriableError(fetchOfflineError)).toBe(true);
      expect(isRetriableError(fetchServerError)).toBe(true);
    });

    it('should handle realistic error scenarios from new ApiError', () => {
      const apiTimeout = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Request timeout');
      const apiOffline = new ApiError(ErrorCode.NETWORK_OFFLINE, 'No internet connection');
      const apiServerError = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'HTTP 503: Service Unavailable', 503);
      const apiUnauthorized = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'HTTP 401: Unauthorized', 401);
      
      expect(isRetriableError(apiTimeout)).toBe(true);
      expect(isRetriableError(apiOffline)).toBe(true);
      expect(isRetriableError(apiServerError)).toBe(true);
      expect(isRetriableError(apiUnauthorized)).toBe(false);
    });
  });
});