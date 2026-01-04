// Test for QueueExecutor retriable vs non-retriable error handling
import { isRetriableError } from '../../src/services/QueueExecutor';

describe('QueueExecutor', () => {
  describe('isRetriableError', () => {
    describe('Network Errors (Retriable)', () => {
      it('should identify network request failed errors as retriable', () => {
        expect(isRetriableError(new Error('Network request failed'))).toBe(true);
        expect(isRetriableError({ message: 'Network request failed' })).toBe(true);
      });

      it('should identify timeout errors as retriable', () => {
        expect(isRetriableError({ name: 'AbortError' })).toBe(true);
        expect(isRetriableError({ message: 'timeout' })).toBe(true);
        expect(isRetriableError({ message: 'Request timeout occurred' })).toBe(true);
      });

      it('should identify offline errors as retriable', () => {
        expect(isRetriableError({ message: 'offline' })).toBe(true);
        expect(isRetriableError({ message: 'no connection' })).toBe(true);
        expect(isRetriableError({ message: 'You are offline' })).toBe(true);
      });
    });

    describe('FetchHttpClient Errors (Retriable)', () => {
      it('should identify HTTP 5xx errors from FetchHttpClient as retriable', () => {
        expect(isRetriableError(new Error('HTTP 500: Internal Server Error'))).toBe(true);
        expect(isRetriableError(new Error('HTTP 503: Service Unavailable'))).toBe(true);
        expect(isRetriableError(new Error('HTTP 502: Bad Gateway'))).toBe(true);
        expect(isRetriableError(new Error('HTTP 504: Gateway Timeout'))).toBe(true);
        expect(isRetriableError({ message: 'HTTP 599: Network Connect Timeout Error' })).toBe(true);
      });

      it('should identify HTTP 408 timeout errors from FetchHttpClient as retriable', () => {
        expect(isRetriableError(new Error('HTTP 408: Request Timeout'))).toBe(true);
        expect(isRetriableError({ message: 'HTTP 408:' })).toBe(true);
        expect(isRetriableError({ message: 'Request Timeout' })).toBe(true);
      });

      it('should identify HTTP 429 rate limiting errors as retriable', () => {
        expect(isRetriableError(new Error('HTTP 429: Too Many Requests'))).toBe(true);
        expect(isRetriableError({ message: 'HTTP 429:' })).toBe(true);
      });
    });

    describe('HTTP Status Code Errors (Mixed)', () => {
      it('should identify server errors (5xx) as retriable', () => {
        expect(isRetriableError({ status: 500 })).toBe(true);
        expect(isRetriableError({ status: 502 })).toBe(true);
        expect(isRetriableError({ status: 503 })).toBe(true);
        expect(isRetriableError({ status: 504 })).toBe(true);
        expect(isRetriableError({ status: 599 })).toBe(true);
      });

      it('should identify specific retriable 4xx errors', () => {
        expect(isRetriableError({ status: 408 })).toBe(true); // Request Timeout
        expect(isRetriableError({ status: 429 })).toBe(true); // Too Many Requests
      });

      it('should identify client errors (4xx) as non-retriable except 408 and 429', () => {
        expect(isRetriableError({ status: 400 })).toBe(false); // Bad Request
        expect(isRetriableError({ status: 401 })).toBe(false); // Unauthorized
        expect(isRetriableError({ status: 403 })).toBe(false); // Forbidden
        expect(isRetriableError({ status: 404 })).toBe(false); // Not Found
        expect(isRetriableError({ status: 422 })).toBe(false); // Unprocessable Entity
        expect(isRetriableError({ status: 499 })).toBe(false); // Client Closed Request
      });

      it('should identify successful responses as non-retriable', () => {
        expect(isRetriableError({ status: 200 })).toBe(false);
        expect(isRetriableError({ status: 201 })).toBe(false);
        expect(isRetriableError({ status: 204 })).toBe(false);
      });

      it('should identify 3xx redirects as non-retriable', () => {
        expect(isRetriableError({ status: 301 })).toBe(false);
        expect(isRetriableError({ status: 302 })).toBe(false);
        expect(isRetriableError({ status: 304 })).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle undefined/null errors as non-retriable', () => {
        expect(isRetriableError(undefined)).toBe(false);
        expect(isRetriableError(null)).toBe(false);
        expect(isRetriableError({})).toBe(false);
      });

      it('should handle errors without status or message as non-retriable', () => {
        expect(isRetriableError({ code: 'SOME_CODE' })).toBe(false);
        expect(isRetriableError({ name: 'SomeError' })).toBe(false);
        expect(isRetriableError(new Error(''))).toBe(false);
      });

      it('should handle string status values correctly based on implementation', () => {
        // String status '500' will be coerced to number during comparison  
        expect(isRetriableError({ status: '500' })).toBe(true); // '500' >= 500 is true
        expect(isRetriableError({ status: 'error' })).toBe(false); // 'error' >= 500 is false
        // Numeric 500 should also work
        expect(isRetriableError({ status: 500 })).toBe(true);
      });

      it('should be case sensitive for message matching', () => {
        expect(isRetriableError({ message: 'NETWORK REQUEST FAILED' })).toBe(false);
        expect(isRetriableError({ message: 'OFFLINE' })).toBe(false);
        expect(isRetriableError({ message: 'TIMEOUT' })).toBe(false);
      });
    });

    describe('Real-world Error Scenarios', () => {
      it('should handle fetch() network errors correctly', () => {
        const fetchError = new TypeError('Network request failed');
        fetchError.name = 'TypeError';
        expect(isRetriableError(fetchError)).toBe(true);
      });

      it('should handle axios-style errors correctly', () => {
        // Axios errors don't have direct .status, need to check .response.status  
        // Our current implementation only checks error.status, not error.response.status
        const axiosError = {
          response: { status: 500 },
          message: 'Request failed with status code 500'
        };
        expect(isRetriableError(axiosError)).toBe(false); // Current implementation doesn't check response.status
        
        // But if we structure it with direct status, it should work
        const directStatusError = { status: 500, message: 'Server error' };
        expect(isRetriableError(directStatusError)).toBe(true);
      });

      it('should handle AbortController timeout errors correctly', () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        expect(isRetriableError(abortError)).toBe(true);
      });

      it('should handle custom offline detection errors correctly', () => {
        const offlineError = new Error('You\'re offline. Check your connection and try again.');
        expect(isRetriableError(offlineError)).toBe(true);
      });

      it('should handle validation errors correctly', () => {
        const validationError = {
          status: 422,
          message: 'Validation failed',
          details: { title: 'is required' }
        };
        expect(isRetriableError(validationError)).toBe(false);
      });
    });

    describe('Priority Testing (Most Common Cases)', () => {
      it('should prioritize message-based detection over status-based', () => {
        // Error with both retriable message and non-retriable status
        const error = {
          message: 'Network request failed',
          status: 400
        };
        expect(isRetriableError(error)).toBe(true);
      });

      it('should handle FetchHttpClient errors with no status property', () => {
        // This is the critical case mentioned in the Phase 2 requirements
        const fetchClientError = new Error('HTTP 503: Service Unavailable');
        expect(isRetriableError(fetchClientError)).toBe(true);
        
        const fetchTimeoutError = new Error('HTTP 408: Request Timeout');
        expect(isRetriableError(fetchTimeoutError)).toBe(true);
      });

      it('should handle the default case correctly', () => {
        // Errors that don\'t match unknown criteria should be non-retriable
        const unknownError = new Error('Something unexpected happened');
        expect(isRetriableError(unknownError)).toBe(false);
        
        const customError = { custom: 'error', data: 123 };
        expect(isRetriableError(customError)).toBe(false);
      });
    });
  });
});
