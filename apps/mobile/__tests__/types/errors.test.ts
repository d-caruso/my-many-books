/**
 * Tests for ApiError and error handling infrastructure
 */

import {
  ApiError,
  ErrorCode,
  RETRIABLE_CODES,
  getClientErrorCode
} from '../../src/types/errors';

describe('ErrorCode enum', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.NETWORK_TIMEOUT).toBe('NETWORK_TIMEOUT');
    expect(ErrorCode.NETWORK_OFFLINE).toBe('NETWORK_OFFLINE');
    expect(ErrorCode.NETWORK_FAILED).toBe('NETWORK_FAILED');
    expect(ErrorCode.HTTP_SERVER_ERROR).toBe('HTTP_SERVER_ERROR');
    expect(ErrorCode.HTTP_CLIENT_ERROR).toBe('HTTP_CLIENT_ERROR');
    expect(ErrorCode.HTTP_UNAUTHORIZED).toBe('HTTP_UNAUTHORIZED');
    expect(ErrorCode.HTTP_FORBIDDEN).toBe('HTTP_FORBIDDEN');
    expect(ErrorCode.HTTP_NOT_FOUND).toBe('HTTP_NOT_FOUND');
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
  });
});

describe('RETRIABLE_CODES', () => {
  it('should include network errors', () => {
    expect(RETRIABLE_CODES).toContain(ErrorCode.NETWORK_TIMEOUT);
    expect(RETRIABLE_CODES).toContain(ErrorCode.NETWORK_OFFLINE);
    expect(RETRIABLE_CODES).toContain(ErrorCode.NETWORK_FAILED);
  });

  it('should include server errors', () => {
    expect(RETRIABLE_CODES).toContain(ErrorCode.HTTP_SERVER_ERROR);
  });

  it('should include rate limiting', () => {
    expect(RETRIABLE_CODES).toContain(ErrorCode.RATE_LIMITED);
  });

  it('should not include client errors', () => {
    expect(RETRIABLE_CODES).not.toContain(ErrorCode.HTTP_CLIENT_ERROR);
    expect(RETRIABLE_CODES).not.toContain(ErrorCode.HTTP_UNAUTHORIZED);
    expect(RETRIABLE_CODES).not.toContain(ErrorCode.HTTP_FORBIDDEN);
    expect(RETRIABLE_CODES).not.toContain(ErrorCode.HTTP_NOT_FOUND);
    expect(RETRIABLE_CODES).not.toContain(ErrorCode.VALIDATION_ERROR);
  });
});

describe('ApiError class', () => {
  it('should create error with code and message', () => {
    const error = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Request timeout');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Request timeout');
    expect(error.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    expect(error.retriable).toBe(true);
    expect(error.statusCode).toBeUndefined();
  });

  it('should create error with status code', () => {
    const error = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Server error', 500);
    
    expect(error.code).toBe(ErrorCode.HTTP_SERVER_ERROR);
    expect(error.message).toBe('Server error');
    expect(error.statusCode).toBe(500);
    expect(error.retriable).toBe(true);
  });

  it('should auto-determine retriability from RETRIABLE_CODES', () => {
    const retriableError = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout');
    const nonRetriableError = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized');
    
    expect(retriableError.retriable).toBe(true);
    expect(nonRetriableError.retriable).toBe(false);
  });

  it('should override retriability when explicitly set', () => {
    const overriddenError = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout', undefined, false);
    
    expect(overriddenError.retriable).toBe(false);
  });

  it('should serialize to JSON correctly', () => {
    const error = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Server error', 500);
    const json = error.toJSON();
    
    expect(json).toMatchObject({
      name: 'ApiError',
      message: 'Server error',
      code: ErrorCode.HTTP_SERVER_ERROR,
      statusCode: 500,
      retriable: true
    });
    expect(json.stack).toBeDefined();
  });

  it('should maintain Error prototype chain', () => {
    const error = new ApiError(ErrorCode.NETWORK_FAILED, 'Network failed');
    
    expect(error instanceof Error).toBe(true);
    expect(error instanceof ApiError).toBe(true);
    expect(error.stack).toBeDefined();
  });
});

describe('ApiError instanceof checking', () => {
  it('should identify ApiError instances correctly', () => {
    const apiError = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout');
    expect(apiError instanceof ApiError).toBe(true);
  });

  it('should distinguish from generic Error instances', () => {
    const genericError = new Error('Generic error');
    expect(genericError instanceof ApiError).toBe(false);
  });

  it('should handle non-error objects', () => {
    expect((null as unknown) instanceof ApiError).toBe(false);
    expect({} instanceof ApiError).toBe(false);
  });

  it('should distinguish from error-like objects', () => {
    const errorLike = {
      name: 'Error',
      message: 'Error message',
      code: ErrorCode.NETWORK_TIMEOUT
    };
    expect(errorLike instanceof ApiError).toBe(false);
  });
});

describe('getClientErrorCode', () => {
  it('should map 401 to HTTP_UNAUTHORIZED', () => {
    expect(getClientErrorCode(401)).toBe(ErrorCode.HTTP_UNAUTHORIZED);
  });

  it('should map 403 to HTTP_FORBIDDEN', () => {
    expect(getClientErrorCode(403)).toBe(ErrorCode.HTTP_FORBIDDEN);
  });

  it('should map 404 to HTTP_NOT_FOUND', () => {
    expect(getClientErrorCode(404)).toBe(ErrorCode.HTTP_NOT_FOUND);
  });

  it('should map 408 to NETWORK_TIMEOUT (retriable)', () => {
    expect(getClientErrorCode(408)).toBe(ErrorCode.NETWORK_TIMEOUT);
  });

  it('should map 429 to RATE_LIMITED (retriable)', () => {
    expect(getClientErrorCode(429)).toBe(ErrorCode.RATE_LIMITED);
  });

  it('should map other 4xx codes to HTTP_CLIENT_ERROR', () => {
    expect(getClientErrorCode(400)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(402)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(405)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(422)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(499)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
  });

  it('should handle edge cases', () => {
    expect(getClientErrorCode(0)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(-1)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
    expect(getClientErrorCode(999)).toBe(ErrorCode.HTTP_CLIENT_ERROR);
  });
});

describe('Error retriability mapping', () => {
  it('should mark network errors as retriable', () => {
    const timeoutError = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Timeout');
    const offlineError = new ApiError(ErrorCode.NETWORK_OFFLINE, 'Offline');
    const failedError = new ApiError(ErrorCode.NETWORK_FAILED, 'Failed');
    
    expect(timeoutError.retriable).toBe(true);
    expect(offlineError.retriable).toBe(true);
    expect(failedError.retriable).toBe(true);
  });

  it('should mark server errors as retriable', () => {
    const serverError = new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Server error');
    expect(serverError.retriable).toBe(true);
  });

  it('should mark rate limiting as retriable', () => {
    const rateLimitError = new ApiError(ErrorCode.RATE_LIMITED, 'Rate limited');
    expect(rateLimitError.retriable).toBe(true);
  });

  it('should mark client errors as non-retriable', () => {
    const unauthorizedError = new ApiError(ErrorCode.HTTP_UNAUTHORIZED, 'Unauthorized');
    const forbiddenError = new ApiError(ErrorCode.HTTP_FORBIDDEN, 'Forbidden');
    const notFoundError = new ApiError(ErrorCode.HTTP_NOT_FOUND, 'Not found');
    const clientError = new ApiError(ErrorCode.HTTP_CLIENT_ERROR, 'Client error');
    const validationError = new ApiError(ErrorCode.VALIDATION_ERROR, 'Validation failed');
    
    expect(unauthorizedError.retriable).toBe(false);
    expect(forbiddenError.retriable).toBe(false);
    expect(notFoundError.retriable).toBe(false);
    expect(clientError.retriable).toBe(false);
    expect(validationError.retriable).toBe(false);
  });
});