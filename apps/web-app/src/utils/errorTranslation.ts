/**
 * Error translation utility for API error responses
 * Translates error codes to localized messages using i18n
 */

import i18n from 'i18next';

interface ApiErrorData {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
  message?: string;
}

interface AxiosLikeError {
  response?: {
    data?: ApiErrorData;
    status?: number;
  };
  message?: string;
}

/**
 * Translate an API error to a localized message
 * Falls back to the API-provided message if translation is not available
 */
export function translateApiError(error: AxiosLikeError | Error | unknown): string {
  // Handle axios-like errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosLikeError;
    const errorData = axiosError.response?.data;

    // New standardized error format: { success: false, error: { code, message, details? } }
    if (errorData?.error?.code) {
      const translatedMessage = i18n.t(`errors:${errorData.error.code}`, {
        defaultValue: errorData.error.message || 'An error occurred',
        ...errorData.error.details,
      });
      return translatedMessage;
    }

    // Legacy error format: { error: "message" } or { message: "message" }
    if (typeof errorData?.error === 'string') {
      return errorData.error;
    }

    if (errorData?.message) {
      return errorData.message;
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return i18n.t('errors:INTERNAL_ERROR', { defaultValue: 'An unexpected error occurred' });
}

/**
 * Extract error code from API error response
 */
export function getErrorCode(error: AxiosLikeError | Error | unknown): string | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosLikeError;
    return axiosError.response?.data?.error?.code || null;
  }
  return null;
}

/**
 * Check if error is an authorization error (403)
 */
export function isAuthorizationError(error: AxiosLikeError | Error | unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosLikeError;
    return axiosError.response?.status === 403;
  }
  return false;
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthenticationError(error: AxiosLikeError | Error | unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosLikeError;
    return axiosError.response?.status === 401;
  }
  return false;
}
