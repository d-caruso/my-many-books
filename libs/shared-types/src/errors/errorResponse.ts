import { ErrorCode } from './errorCodes';

/**
 * Standardized API error response format
 * Used by middleware and controllers for consistent error responses
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string; // English default (for debugging/logging)
    details?: Record<string, unknown>; // Additional context (e.g., rate limit info)
  };
  requestId?: string;
}

/**
 * Helper type for error details in responses
 */
export interface ErrorDetails {
  action?: string;
  resource?: string;
  authenticated?: boolean;
  role?: string;
  limit?: number;
  windowMs?: number;
  retryAfter?: number;
  field?: string;
  [key: string]: unknown;
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
  requestId?: string
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details && Object.keys(details).length > 0) {
    response.error.details = details;
  }

  if (requestId) {
    response.requestId = requestId;
  }

  return response;
}
