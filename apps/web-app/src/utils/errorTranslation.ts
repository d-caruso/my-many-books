import i18n from 'i18next';

interface ApiErrorData {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };
    };
  };
  message?: string;
}

function normalizeApiError(error: unknown): ApiErrorData {
  if (typeof error === 'object' && error !== null) {
    return error as ApiErrorData;
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return {};
}

/**
 * Translates API error codes to localized messages
 * Falls back to the English message from the API if translation is not available
 */
export function translateApiError(error: unknown): string {
  const normalizedError = normalizeApiError(error);
  const errorData = normalizedError.response?.data?.error;
  const errorCode = errorData?.code;
  const fallbackMessage = errorData?.message || normalizedError.message || 'An error occurred';

  if (errorCode) {
    // Try to translate the error code
    const translatedMessage = i18n.t(`errors:${errorCode}`, {
      defaultValue: fallbackMessage,
      ...errorData?.details,
    });
    return translatedMessage;
  }

  return fallbackMessage;
}

/**
 * Extracts error code from API error response
 */
export function getErrorCode(error: unknown): string | undefined {
  return normalizeApiError(error).response?.data?.error?.code;
}

/**
 * Extracts error details from API error response
 */
export function getErrorDetails(error: unknown): Record<string, unknown> | undefined {
  return normalizeApiError(error).response?.data?.error?.details;
}
