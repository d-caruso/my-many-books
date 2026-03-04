import { ERROR_CODES } from '@my-many-books/shared-types';

const AUTH_ERROR_I18N: Record<string, string> = {
  [ERROR_CODES.AUTH_FAILED]: 'invalid_credentials',
  [ERROR_CODES.CONFLICT]: 'email_already_registered',
  [ERROR_CODES.VALIDATION_FAILED]: 'invalid_data',
  [ERROR_CODES.NOT_FOUND]: 'user_not_found',
  [ERROR_CODES.INTERNAL_ERROR]: 'unexpected_error',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'session_invalid',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'session_expired',
};

export const getAuthErrorI18nKey = (code: string, namespace = 'common'): string => {
  const key = AUTH_ERROR_I18N[code];
  return key ? `${namespace}:${key}` : `${namespace}:unexpected_error`;
};
