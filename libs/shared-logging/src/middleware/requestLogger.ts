/**
 * Request logging middleware using Pino
 *
 * Logs all HTTP requests with timing, status codes, and trace IDs
 */

import pinoHttp from 'pino-http';
import pino from 'pino';
import { Request, Response } from 'express';
import { createPinoConfig } from '../config/pinoConfig';
import { getCurrentTraceId } from './traceIdGenerator';

/**
 * Options for request logger middleware
 */
export interface RequestLoggerOptions {
  /**
   * Custom Pino logger instance (optional)
   */
  logger?: pino.Logger;

  /**
   * Custom log level (optional, defaults based on status code)
   */
  level?: pino.LevelWithSilent;

  /**
   * Function to determine if request should be logged
   */
  shouldLog?: (req: Request, res: Response) => boolean;

  /**
   * Custom fields to add to every log
   */
  customFields?: Record<string, unknown>;
}

/**
 * Default function to determine log level based on status code
 */
function getLogLevel(
  _req: Request,
  res: Response
): pino.LevelWithSilent {
  const statusCode = res.statusCode;

  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * Create request logging middleware
 *
 * @param options - Configuration options
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { requestLoggerMiddleware, traceIdMiddleware } from '@my-many-books/shared-logging';
 *
 * const app = express();
 *
 * // Apply trace ID middleware first
 * app.use(traceIdMiddleware());
 *
 * // Then apply request logger
 * app.use(requestLoggerMiddleware());
 * ```
 */
export function requestLoggerMiddleware(options: RequestLoggerOptions = {}) {
  const logger = options.logger || pino(createPinoConfig());

  return pinoHttp({
    logger: logger as pino.Logger<string>,

    // Determine log level based on response status
    customLogLevel: options.level
      ? () => options.level!
      : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (req, res, _err) =>
          getLogLevel(req as Request, res as Response),

    // Add custom fields to every log
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customProps: (_req, _res) => {
      const traceId = getCurrentTraceId();

      return {
        traceId,
        ...(options.customFields || {}),
      };
    },

    // Custom success message
    customSuccessMessage: (req, res) => {
      const method = (req as Request).method;
      const url = (req as Request).url;
      const statusCode = (res as Response).statusCode;

      return `${method} ${url} - ${statusCode}`;
    },

    // Custom error message
    customErrorMessage: (req, res, error) => {
      const method = (req as Request).method;
      const url = (req as Request).url;
      const statusCode = (res as Response).statusCode;

      return `${method} ${url} - ${statusCode} - ${error.message}`;
    },

    // Custom fields in the log
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'responseTimeMs',
    },

    // Don't log if shouldLog returns false
    autoLogging: {
      ignore: (req) => {
        if (options.shouldLog) {
          return !options.shouldLog(req as Request, {} as Response);
        }
        // Skip health check endpoints by default
        return (req as Request).url === '/health';
      },
    },
  });
}
