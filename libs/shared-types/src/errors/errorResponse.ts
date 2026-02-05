/**
 * Standardized API error response type
 */

import { z } from 'zod';
import { ERROR_CODES, type ErrorCode } from './errorCodes';

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      ERROR_CODES.AUTH_TOKEN_MISSING,
      ERROR_CODES.AUTH_TOKEN_INVALID,
      ERROR_CODES.AUTH_TOKEN_EXPIRED,
      ERROR_CODES.AUTH_HEADER_INVALID,
      ERROR_CODES.AUTH_FAILED,
      ERROR_CODES.FORBIDDEN,
      ERROR_CODES.ADMIN_REQUIRED,
      ERROR_CODES.ROLE_REQUIRED,
      ERROR_CODES.ACCOUNT_DEACTIVATED,
      ERROR_CODES.API_KEY_MISSING,
      ERROR_CODES.API_KEY_INVALID,
      ERROR_CODES.API_KEY_TIER_NOT_FOUND,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ERROR_CODES.QUOTA_EXCEEDED,
      ERROR_CODES.USAGE_LIMIT_EXCEEDED,
      ERROR_CODES.VALIDATION_FAILED,
      ERROR_CODES.INVALID_REQUEST_BODY,
      ERROR_CODES.NOT_FOUND,
      ERROR_CODES.INTERNAL_ERROR,
      ERROR_CODES.SERVICE_UNAVAILABLE,
    ]),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Helper function to create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}
