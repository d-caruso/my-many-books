import { ERROR_CODES, type ErrorCode } from '@my-many-books/shared-types';
import { ApiErrorPayload, ApiResponse } from '../common/ApiResponse';

export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

const getDefaultErrorCodeForStatus = (statusCode: number): ErrorCode => {
  if (statusCode === 503) {
    return ERROR_CODES.SERVICE_UNAVAILABLE;
  }

  if (statusCode >= 500) {
    return ERROR_CODES.INTERNAL_ERROR;
  }

  switch (statusCode) {
    case 400:
    case 422:
      return ERROR_CODES.VALIDATION_FAILED;
    case 401:
      return ERROR_CODES.AUTH_FAILED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    case 429:
      return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};

const isApiErrorPayload = (value: unknown): value is ApiErrorPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeError = value as Partial<ApiErrorPayload>;
  return typeof maybeError.message === 'string';
};

export const normalizeApiError = (
  error: ApiResponse['error'],
  details?: unknown,
  fallbackCode: string = ERROR_CODES.INTERNAL_ERROR
): ApiErrorEnvelope['error'] => {
  if (isApiErrorPayload(error)) {
    const mergedDetails = error.details ?? details;
    return {
      code: error.code ?? fallbackCode,
      message: error.message,
      ...(mergedDetails !== undefined && { details: mergedDetails }),
    };
  }

  if (typeof error === 'string' && error.length > 0) {
    return {
      code: fallbackCode,
      message: error,
      ...(details !== undefined && { details }),
    };
  }

  return {
    code: fallbackCode,
    message: 'Internal server error',
    ...(details !== undefined && { details }),
  };
};

export const formatApiResponse = (
  result: ApiResponse,
  requestId?: string
): ApiSuccessEnvelope | ApiErrorEnvelope => {
  if (result.success) {
    return {
      success: true,
      data: result.data ?? null,
      ...(result.message && { message: result.message }),
      ...(result.meta && { meta: result.meta }),
      ...(result.pagination && { pagination: result.pagination }),
    };
  }

  return {
    success: false,
    error: normalizeApiError(
      result.error,
      result.details,
      getDefaultErrorCodeForStatus(result.statusCode)
    ),
    ...(requestId && { requestId }),
  };
};
