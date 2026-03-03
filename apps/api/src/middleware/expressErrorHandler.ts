// ================================================================
// src/middleware/expressErrorHandler.ts
// Centralized Express error handling middleware
// ================================================================

import { NextFunction, Request, Response } from 'express';
import { ApplicationError, BadRequestError, InternalServerError } from '../errors/ApplicationError';
import { getLogger } from '@my-many-books/shared-logging';
import { getCurrentTraceId } from '@my-many-books/shared-logging';
import { normalizeApiError } from '../utils/apiResponseFormatter';

const isJsonSyntaxError = (
  error: Error
): error is SyntaxError & { status?: number; statusCode?: number } => {
  if (!(error instanceof SyntaxError)) {
    return false;
  }
  const { status, statusCode } = error as { status?: number; statusCode?: number };
  return status === 400 || statusCode === 400;
};

export const expressErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError =
    error instanceof ApplicationError
      ? error
      : isJsonSyntaxError(error)
        ? new BadRequestError('Invalid JSON payload', undefined, 'INVALID_JSON')
        : new InternalServerError('Internal server error');

  const isProduction = process.env['NODE_ENV'] === 'production';
  const traceId = getCurrentTraceId();

  if (!isProduction || !appError.isOperational) {
    getLogger().error(
      {
        err: error,
        traceId,
        code: appError.code,
        statusCode: appError.statusCode,
        isOperational: appError.isOperational,
      },
      'Unhandled application error'
    );
  }

  const details = !isProduction && error.stack
    ? {
        ...(typeof appError.details === 'object' && appError.details !== null
          ? (appError.details as Record<string, unknown>)
          : appError.details !== undefined
            ? { details: appError.details }
            : {}),
        stack: error.stack,
      }
    : appError.details;

  res.status(appError.statusCode).json({
    success: false,
    error: normalizeApiError(
      {
        code: appError.code,
        message: appError.message,
        ...(appError.details !== undefined && { details: appError.details }),
      },
      details,
      appError.code
    ),
    ...(traceId && { requestId: traceId }),
  });
};
