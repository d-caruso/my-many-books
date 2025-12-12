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
type AppLogger = ReturnType<typeof pino>;
let loggerInstance: AppLogger | undefined;

/**
 * Get the singleton Pino logger instance
 *
 * @returns Pino logger
 */
export function getLogger(): AppLogger {
  if (!loggerInstance) {
    loggerInstance = pino(createPinoConfig());
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
  error?: unknown,
  context?: Record<string, unknown>
): void {
  const logger = getLogger();
  const traceId = getCurrentTraceId();

  const err = normalizeError(error);
  const safeContext: Record<string, unknown> = {
    traceId,
    ...context,
  };
  if (err) {
    safeContext['err'] = err;
  }
  logger.error(safeContext, message);
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

const normalizeError = (value: unknown): Error | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Error) {
    return value;
  }

  const serialized =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : serializeUnknown(value);

  return new Error(serialized);
};

const serializeUnknown = (input: unknown): string => {
  try {
    return JSON.stringify(input);
  } catch {
    return '[unserializable error]';
  }
};
