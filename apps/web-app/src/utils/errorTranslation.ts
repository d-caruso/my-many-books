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

/**
 * Translates API error codes to localized messages
 * Falls back to the English message from the API if translation is not available
 */
export function translateApiError(error: ApiErrorData): string {
  const errorData = error.response?.data?.error;
  const errorCode = errorData?.code;
  const fallbackMessage = errorData?.message || error.message || 'An error occurred';

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
export function getErrorCode(error: ApiErrorData): string | undefined {
  return error.response?.data?.error?.code;
}

/**
 * Extracts error details from API error response
 */
export function getErrorDetails(error: ApiErrorData): Record<string, unknown> | undefined {
  return error.response?.data?.error?.details;
}
