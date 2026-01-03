/**
 * Error types and infrastructure for structured error handling
 * Replaces generic Error string checking with typed error codes
 * Prepares foundation for hookey integration and structured logging
 */

/**
 * Standardized error codes for API and network operations
 */
export enum ErrorCode {
  // Network-related errors (retriable)
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_FAILED = 'NETWORK_FAILED',
  
  // HTTP server errors (retriable)
  HTTP_SERVER_ERROR = 'HTTP_SERVER_ERROR',
  
  // HTTP client errors (non-retriable, except specific cases)
  HTTP_CLIENT_ERROR = 'HTTP_CLIENT_ERROR',
  HTTP_UNAUTHORIZED = 'HTTP_UNAUTHORIZED',
  HTTP_FORBIDDEN = 'HTTP_FORBIDDEN',
  HTTP_NOT_FOUND = 'HTTP_NOT_FOUND',
  
  // Validation errors (non-retriable)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Rate limiting (retriable)
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Queue operation errors (retriable)
  QUEUE_ERROR = 'QUEUE_ERROR'
}

/**
 * Error codes that indicate the operation should be retried
 */
export const RETRIABLE_CODES: ErrorCode[] = [
  ErrorCode.NETWORK_TIMEOUT,
  ErrorCode.NETWORK_OFFLINE,
  ErrorCode.NETWORK_FAILED,
  ErrorCode.HTTP_SERVER_ERROR,
  ErrorCode.RATE_LIMITED,
  ErrorCode.QUEUE_ERROR
];

/**
 * Structured API error with typed error codes
 * Extends Error to maintain compatibility with existing error handling
 */
export class ApiError extends Error {
  /**
   * Structured error code for programmatic handling
   */
  public readonly code: ErrorCode;
  
  /**
   * HTTP status code (if applicable)
   */
  public readonly statusCode?: number;
  
  /**
   * Whether this error indicates a retriable operation
   */
  public readonly retriable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    retriable?: boolean
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    
    // Auto-determine retriability based on error code if not explicitly set
    this.retriable = retriable !== undefined ? retriable : RETRIABLE_CODES.includes(code);
  }

  /**
   * Convert to plain object for logging/serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      retriable: this.retriable,
      stack: this.stack
    };
  }
}


/**
 * Map HTTP status codes to specific error codes
 */
export function getClientErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 401:
      return ErrorCode.HTTP_UNAUTHORIZED;
    case 403:
      return ErrorCode.HTTP_FORBIDDEN;
    case 404:
      return ErrorCode.HTTP_NOT_FOUND;
    case 408:
      return ErrorCode.NETWORK_TIMEOUT; // Request Timeout is retriable
    case 429:
      return ErrorCode.RATE_LIMITED; // Too Many Requests is retriable
    default:
      return ErrorCode.HTTP_CLIENT_ERROR;
  }
}