// ================================================================
// src/controllers/base/BaseController.ts
// Platform-agnostic base controller with reusable helpers
// ================================================================

import Joi from 'joi';
import { i18n } from '@my-many-books/shared-i18n';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';

// Added the PaginationParams interface
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export abstract class BaseController {
  protected static readonly MAX_LIMIT = 100;
  protected static readonly DEFAULT_LIMIT = 20;
  protected static readonly DEFAULT_PAGE = 1;

  /**
   * Initialize i18n with language from Accept-Language header
   * Falls back to English if header is missing or invalid
   */
  protected async initializeI18n(request: UniversalRequest): Promise<void> {
    const acceptLanguage = request.headers?.['accept-language'] ||
                          request.headers?.['Accept-Language'] ||
                          'en';
    const language = this.parseLanguageCode(acceptLanguage);
    await i18n.changeLanguage(language);
  }

  /**
   * Parse Accept-Language header to extract primary language code
   * Examples: "en-US,en;q=0.9,it;q=0.8" -> "en"
   *           "it-IT" -> "it"
   *           "fr" -> "en" (fallback if not supported)
   */
  protected parseLanguageCode(acceptLanguage: string): string {
    const primaryLang = acceptLanguage?.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()?.toLowerCase() || 'en';
    const supportedLanguages = ['en', 'it'];
    return supportedLanguages.includes(primaryLang) ? primaryLang : 'en';
  }

  /**
   * Translate a key using i18n
   * @param key - Translation key with namespace (e.g., "errors:book_not_found")
   * @param interpolation - Optional interpolation values
   */
  protected t(key: string, interpolation?: object): string {
    return i18n.t(key, interpolation as any) as string;
  }

  protected createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: any,
    statusCode: number = 200
  ): ApiResponse<T> {
    return {
      statusCode,
      success: true,
      data,
      ...(message && { message }),
      ...(meta && { pagination: meta }),
    };
  }

  protected createErrorResponse(
    error: string,
    statusCode: number = 400,
    details?: any
  ): ApiResponse {
    return {
      statusCode,
      success: false,
      error,
      ...(details && { details }),
    };
  }

  /**
   * Create error response with i18n translation
   * @param errorKey - Translation key (e.g., "errors:book_not_found")
   * @param statusCode - HTTP status code
   * @param interpolation - Optional interpolation values for translation
   * @param details - Optional additional error details
   */
  protected createErrorResponseI18n(
    errorKey: string,
    statusCode: number = 400,
    interpolation?: object,
    details?: any
  ): ApiResponse {
    const errorMessage = this.t(errorKey, interpolation);
    return this.createErrorResponse(errorMessage, statusCode, details);
  }

  protected parseBody<T>(request: UniversalRequest): T | null {
    if (!request.body) {
      return null;
    }

    // If body is already parsed (object), return it directly
    if (typeof request.body === 'object') {
      return request.body as T;
    }

    // If body is string, try to parse it
    try {
      return JSON.parse(request.body as string) as T;
    } catch {
      return null;
    }
  }

  protected validateRequest<T>(
    data: any,
    schema: Joi.ObjectSchema<T>
  ): { isValid: boolean; value?: T; errors?: string[] } {
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => {
        // Check if the message is a translation key (contains ":")
        if (detail.message.includes(':')) {
          return this.t(detail.message, detail.context);
        }
        // Otherwise return the message as-is (for backward compatibility)
        return detail.message;
      });
      return { isValid: false, errors };
    }

    return { isValid: true, value: value as T };
  }

  protected getPaginationParams(request: UniversalRequest): PaginationParams {
    const queryParams = request.queryStringParameters || {};
    const page = Math.max(1, parseInt(queryParams['page'] || '1', 10));
    const limit = Math.min(
      BaseController.MAX_LIMIT,
      Math.max(1, parseInt(queryParams['limit'] || BaseController.DEFAULT_LIMIT.toString(), 10))
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  protected getPathParameter(request: UniversalRequest, paramName: string): string | null {
    return request.pathParameters?.[paramName] || null;
  }

  protected getQueryParameter(request: UniversalRequest, paramName: string): string | null {
    return request.queryStringParameters?.[paramName] || null;
  }

  protected createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): { page: number; limit: number; total: number; totalPages: number } {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
