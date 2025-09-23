// ================================================================
// src/controllers/base/BaseController.ts
// Platform-agnostic base controller with reusable helpers
// ================================================================

import Joi from 'joi';
import { ApiResponse } from '../../common/ApiResponse';

interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
}

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
      return JSON.parse(request.body) as T;
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
      const errors = error.details.map(detail => detail.message);
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
