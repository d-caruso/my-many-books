/**
 * Application-wide Pino logger service
 *
 * Provides a singleton logger instance for structured logging
 * throughout the application.
 *
 * Features:
 * - Structured JSON logging (CloudWatch compatible)
 * - Automatic PII redaction
 * - TraceId correlation
 * - Environment-aware log levels
 * - Pretty printing in development
 */

import pino from 'pino';
import { createPinoConfig, getCurrentTraceId } from '@my-many-books/shared-logging';

/**
 * Singleton Pino logger instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loggerInstance: any;

/**
 * Get the singleton Pino logger instance
 *
 * @returns Pino logger
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLogger(): any {
  if (!loggerInstance) {
    loggerInstance = pino(createPinoConfig() as unknown as pino.LoggerOptions);
  }
  return loggerInstance;
}

/**
 * Log an info message
 *
 * @param message - Log message
 * @param context - Additional context
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger();
  const traceId = getCurrentTraceId();

  logger.info(
    {
      traceId,
      ...context,
    },
    message
  );
}

/**
 * Log a warning message
 *
 * @param message - Log message
 * @param context - Additional context
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger();
  const traceId = getCurrentTraceId();

  logger.warn(
    {
      traceId,
      ...context,
    },
    message
  );
}

/**
 * Log an error message
 *
 * @param message - Log message
 * @param error - Error object (optional)
 * @param context - Additional context
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>
): void {
  const logger = getLogger();
  const traceId = getCurrentTraceId();

  const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;

  logger.error(
    {
      traceId,
      err,
      ...context,
    },
    message
  );
}

/**
 * Log a debug message
 *
 * @param message - Log message
 * @param context - Additional context
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger();
  const traceId = getCurrentTraceId();

  logger.debug(
    {
      traceId,
      ...context,
    },
    message
  );
}
