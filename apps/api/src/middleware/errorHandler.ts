// ================================================================
// src/middleware/errorHandler.ts
// ================================================================

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getLogger } from '@my-many-books/shared-logging';
import { ERROR_CODES, type ErrorCode } from '@my-many-books/shared-types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errorCode?: ErrorCode;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.VALIDATION_FAILED;

  constructor(
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.NOT_FOUND;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.CONFLICT;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.AUTH_FAILED;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements AppError {
  statusCode = 403;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.FORBIDDEN;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;
  errorCode: ErrorCode = ERROR_CODES.SERVICE_UNAVAILABLE;

  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Maps error to its error code
 */
const getErrorCode = (error: Error | AppError): ErrorCode => {
  const appError = error as AppError;
  if (appError.errorCode) {
    return appError.errorCode;
  }
  // Default error code based on status
  const statusCode = appError.statusCode || 500;
  if (statusCode >= 500) {
    return ERROR_CODES.INTERNAL_ERROR;
  }
  return ERROR_CODES.VALIDATION_FAILED;
};

export const createErrorResponse = (
  error: Error | AppError,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult => {
  const appError = error as AppError;
  const statusCode = appError.statusCode || 500;
  const isOperational = appError.isOperational || false;
  const errorCode = getErrorCode(error);

  // Log error details
  getLogger().error(
    {
      err: error,
      statusCode,
      isOperational,
      path: event?.resource,
      method: event?.httpMethod,
      requestId: event?.requestContext?.requestId,
    },
    'Error occurred'
  );

  // Don't expose internal error details in production
  const isProduction = process.env['NODE_ENV'] === 'production';
  const errorMessage = isOperational || !isProduction ? error.message : 'Internal server error';

  // Build standardized error response
  const errorObj: Record<string, unknown> = {
    code: errorCode,
    message: errorMessage,
  };

  // Add details for validation errors
  if (error instanceof ValidationError && error.details) {
    errorObj['details'] = error.details;
  }

  const response: Record<string, unknown> = {
    success: false,
    error: errorObj,
  };

  if (event?.requestContext?.requestId) {
    response['requestId'] = event.requestContext.requestId;
  }

  if (!isProduction && !isOperational && error.stack) {
    response['stack'] = error.stack;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(response),
  };
};

export const asyncHandler = (
  fn: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      return await fn(event);
    } catch (error) {
      return createErrorResponse(error as Error, event);
    }
  };
};

// Convenience function for error handling
export const errorHandler = (
  error: Error | AppError,
  event?: APIGatewayProxyEvent
): APIGatewayProxyResult => {
  return createErrorResponse(error, event);
};
