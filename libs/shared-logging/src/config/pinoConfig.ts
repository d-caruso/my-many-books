/**
 * Pino logger configuration
 *
 * Provides base configuration for structured logging with Pino
 */

import type { LoggerOptions } from 'pino';
import { redactionConfig } from './redactionRules';

type PinoLoggerOptions = LoggerOptions<string>;

/**
 * Environment for logging configuration
 */
export type LogEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'production';

/**
 * Get current environment
 */
export function getEnvironment(): LogEnvironment {
  const env = process.env['NODE_ENV'] || 'development';
  if (
    env === 'development' ||
    env === 'test' ||
    env === 'staging' ||
    env === 'production'
  ) {
    return env;
  }
  return 'development';
}

/**
 * Get log level for environment
 *
 * @param env - Environment
 * @returns Pino log level
 */
export function getLogLevel(env: LogEnvironment = getEnvironment()): string {
  const levels: Record<LogEnvironment, string> = {
    development: process.env['LOG_LEVEL'] || 'debug',
    test: process.env['LOG_LEVEL'] || 'error',
    staging: process.env['LOG_LEVEL'] || 'info',
    production: process.env['LOG_LEVEL'] || 'warn',
  };

  return levels[env];
}

/**
 * Error serializer for Pino
 *
 * Ensures errors are logged with stack traces
 */
export function errorSerializer(error: Error): Record<string, any> {
  return {
    type: error.name,
    message: error.message,
    stack: error.stack,
  };
}

/**
 * Request serializer for Pino HTTP
 *
 * Serializes Express request objects
 */
export function requestSerializer(req: any): Record<string, any> {
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    path: req.path,
    params: req.params,
    query: req.query,
    headers: {
      host: req.headers?.host,
      'user-agent': req.headers?.['user-agent'],
      'content-type': req.headers?.['content-type'],
      // Don't log authorization headers
    },
    remoteAddress: req.ip || req.connection?.remoteAddress,
  };
}

/**
 * Response serializer for Pino HTTP
 *
 * Serializes Express response objects
 */
export function responseSerializer(res: any): Record<string, any> {
  return {
    statusCode: res.statusCode,
    headers: {
      'content-type': res.headers?.['content-type'],
      'content-length': res.headers?.['content-length'],
    },
  };
}

/**
 * Base Pino configuration
 *
 * Provides sensible defaults for structured logging
 */
export function createPinoConfig(env: LogEnvironment = getEnvironment()): PinoLoggerOptions {
  const isDevelopment = env === 'development';
  const isTest = env === 'test';

  return {
    level: getLogLevel(env),

    // Pretty print in development for better readability
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    }),

    // Disable logging in test unless explicitly enabled
    ...( isTest && !process.env['ENABLE_TEST_LOGGING'] && {
      level: 'silent',
    }),

    // Base configuration
    base: {
      service: process.env['SERVICE_NAME'] || 'my-many-books',
      environment: env,
    },

    // Timestamp in ISO format
    timestamp: () => `,"time":"${new Date().toISOString()}"`,

    // Redact sensitive fields
    redact: redactionConfig,

    // Custom serializers
    serializers: {
      err: errorSerializer,
      error: errorSerializer,
      req: requestSerializer,
      res: responseSerializer,
    },

    // Format error objects
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  };
}

/**
 * Default Pino configuration for current environment
 */
export const defaultPinoConfig: PinoLoggerOptions = createPinoConfig();
