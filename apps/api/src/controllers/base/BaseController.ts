// ================================================================
// src/controllers/base/BaseController.ts
// Platform-agnostic base controller with reusable helpers
// ================================================================

import Joi from 'joi';
import { i18n } from '@my-many-books/shared-i18n';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { getLogger } from '@my-many-books/shared-logging';

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
    try {
      const acceptLanguage =
        request.headers?.['accept-language'] || request.headers?.['Accept-Language'] || 'en';
      const language = this.parseLanguageCode(acceptLanguage);

      // Only change language if i18n is properly initialized
      if (i18n && i18n.isInitialized) {
        await i18n.changeLanguage(language);
      }
    } catch (error) {
      // Silently fail if i18n is not properly configured
      // This allows the API to work without i18n
      getLogger().warn(
        {
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'i18n initialization failed'
      );
    }
  }

  /**
   * Parse Accept-Language header to extract primary language code
   * Examples: "en-US,en;q=0.9,it;q=0.8" -> "en"
   *           "it-IT" -> "it"
   *           "fr" -> "en" (fallback if not supported)
   */
  protected parseLanguageCode(acceptLanguage: string): string {
    const primaryLang =
      acceptLanguage?.split(',')[0]?.split('-')[0]?.split(';')[0]?.trim()?.toLowerCase() || 'en';
    const supportedLanguages = ['en', 'it'];
    return supportedLanguages.includes(primaryLang) ? primaryLang : 'en';
  }

  /**
   * Translate a key using i18n
   * @param key - Translation key with namespace (e.g., "errors:book_not_found")
   * @param interpolation - Optional interpolation values
   */
  protected t(key: string, interpolation?: object): string {
    return i18n.t(key, interpolation as Record<string, unknown>);
  }

  protected createSuccessResponse<T>(
    data: T,
    message?: string,
    meta?: Record<string, unknown>,
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
    details?: Record<string, unknown>
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
   * @param details - Optional additional error details as a Record
   */
  protected createErrorResponseI18n(
    errorKey: string,
    statusCode: number = 400,
    interpolation?: object,
    details?: Record<string, unknown>
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
    data: unknown,
    schema: Joi.ObjectSchema<T>
  ): { isValid: boolean; value?: T; errors?: string[] } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => {
        // Check if the message is a translation key (contains ":")
        if (detail.message.includes(':')) {
          return this.t(detail.message, detail.context as object | undefined);
        }
        // Otherwise return the message as-is (for backward compatibility)
        return detail.message;
      });
      return { isValid: false, errors };
    }

    return { isValid: true, value: value };
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
    return request.params?.[paramName] || null;
  }

  protected getQueryParameter(request: UniversalRequest, paramName: string): string | null {
    return request.queryStringParameters?.[paramName] || null;
  }

  protected createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): { currentPage: number; itemsPerPage: number; totalItems: number; totalPages: number } {
    return {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Verify resource ownership for non-admin users
   *
   * This helper method checks if the authenticated user owns the resource
   * or if they are an admin (who can access any resource).
   *
   * @param request - The universal request containing the authenticated user
   * @param resourceUserId - The userId of the resource being accessed
   * @returns ApiResponse with 403 error if permission denied, null if allowed
   *
   * @example
   * ```typescript
   * const author = await Author.findByPk(id);
   * const ownershipError = this.verifyOwnership(request, author.userId);
   * if (ownershipError) return ownershipError;
   * ```
   */
  protected verifyOwnership(
    request: UniversalRequest,
    resourceUserId: number | undefined
  ): ApiResponse | null {
    // No user in request - should not happen after auth middleware
    if (!request.user) {
      return this.createErrorResponseI18n('errors:permission_denied', 403);
    }

    // No userId on resource - data integrity issue
    if (resourceUserId === undefined) {
      return this.createErrorResponseI18n('errors:permission_denied', 403);
    }

    // Admin can access any resource
    if (request.user.role === USER_ROLES.ADMIN) {
      return null;
    }

    // Check if user owns the resource
    if (resourceUserId !== request.user.id) {
      return this.createErrorResponseI18n('errors:permission_denied', 403);
    }

    // Ownership verified
    return null;
  }



  /**
   * Parse boolean value from string
   */
  protected parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true';
  }

  /**
   * Parse number value from string
   */
  protected parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Ensure user is authenticated
   */
  protected ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
  }

  /**
   * Get ID parameter from request
   * @param request - The universal request containing path parameters
   * @returns The ID as a number, or null if missing/invalid
   */
  protected getIdParam(request: UniversalRequest): number | null {
    const id = request.params?.['id'];
    return typeof id === 'string' ? parseInt(id, 10) : null;
  }

  /** Helper method to check access and return boolean
   * @param request - The universal request containing the authenticated user
   * @param targetUserId - The userId of the resource being accessed
   * @returns boolean indicating if access is allowed
   */
  protected hasUserAccess(request: UniversalRequest, targetUserId: number): boolean {
    const currentUserId = request.user?.id;

    if (currentUserId === undefined || currentUserId === null) {
      return false;
    }

    if (currentUserId === targetUserId) {
      return true;
    }

    if (request.user?.isAdmin) {
      return true;
    }

    return false;
  }

  /** *Helper method to create a standardized access denied response
   * @param request - The universal request containing the authenticated user
   * @returns ApiResponse with 401 or 403 error
   */
  protected createAccessDeniedResponse(request: UniversalRequest): ApiResponse {
    const currentUserId = request.user?.id;

    // Must be authenticated
    if (currentUserId === undefined || currentUserId === null) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }

    return this.createErrorResponseI18n('errors:access_denied', 403);
  }
}
