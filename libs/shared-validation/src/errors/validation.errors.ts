/**
 * Validation Error Messages and Codes
 *
 * Centralized error messages for validation failures.
 * Provides both i18n keys and fallback messages.
 */

/**
 * General validation error codes
 */
export const VALIDATION_ERROR_CODES = Object.freeze({
  REQUIRED: 'validation.required',
  INVALID_FORMAT: 'validation.invalid_format',
  TOO_SHORT: 'validation.too_short',
  TOO_LONG: 'validation.too_long',
  OUT_OF_RANGE: 'validation.out_of_range',
  INVALID_TYPE: 'validation.invalid_type',
  PATTERN_MISMATCH: 'validation.pattern_mismatch',
} as const);

/**
 * General validation error messages (fallback)
 */
export const VALIDATION_ERROR_MESSAGES = Object.freeze({
  REQUIRED: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  TOO_SHORT: 'Value is too short',
  TOO_LONG: 'Value is too long',
  OUT_OF_RANGE: 'Value is out of range',
  INVALID_TYPE: 'Invalid data type',
  PATTERN_MISMATCH: 'Value does not match expected pattern',
} as const);

/**
 * Creates a standardized validation error object
 */
export function createValidationError(
  field: string,
  code: string,
  message: string,
  value?: unknown,
  constraint?: unknown
) {
  return {
    field,
    code,
    message,
    value,
    constraint,
  };
}

/**
 * Formats validation errors for API response
 */
export function formatValidationErrors(errors: Array<{ field: string; message: string }>) {
  return {
    success: false,
    error: 'Validation failed',
    details: errors,
    count: errors.length,
  };
}
