// ================================================================
// src/middleware/expressErrorHandler.ts
// Centralized Express error handling middleware
// ================================================================

import { NextFunction, Request, Response } from 'express';
import { ApplicationError, BadRequestError, InternalServerError } from '../errors/ApplicationError';

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

  if (!isProduction || !appError.isOperational) {
    console.error('Unhandled application error:', {
      name: error.name,
      message: error.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: error.stack,
    });
  }

  const payload: Record<string, unknown> = {
    success: false,
    error: appError.message,
    code: appError.code,
  };

  if (appError.details) {
    payload['details'] = appError.details;
  }

  if (!isProduction && error.stack) {
    payload['stack'] = error.stack;
  }

  res.status(appError.statusCode).json(payload);
};
