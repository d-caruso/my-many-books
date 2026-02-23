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
import type { Logger } from 'pino';
import { createPinoConfig } from '../config/pinoConfig';

/**
 * Singleton Pino logger instance
 */
export type AppLogger = ReturnType<typeof pino>;

// Re-export Logger type for consumers
export type { Logger };
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

