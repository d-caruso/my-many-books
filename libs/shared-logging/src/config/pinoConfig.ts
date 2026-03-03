/**
 * Pino logger configuration
 *
 * Provides base configuration for structured logging with Pino
 */

import type { LoggerOptions } from 'pino';
import { redactionConfig } from './redactionRules';

type PinoLoggerOptions = LoggerOptions<string>;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Environment for logging configuration
 */
export type LogEnvironment =
  | 'development'
  | 'test'
  | 'staging'
  | 'production';

/**
 * Check if running in AWS Lambda
 */
export function isLambda(): boolean {
  return !!(
    process.env['AWS_LAMBDA_FUNCTION_NAME'] ||
    process.env['LAMBDA_TASK_ROOT'] ||
    process.env['AWS_EXECUTION_ENV']
  );
}

/**
 * Get current environment
 */
export function getEnvironment(): LogEnvironment {
  const env = process.env['NODE_ENV'] || 'development';

  // Map common environment values to standard names
  const envMapping: Record<string, LogEnvironment> = {
    'dev': 'production', // AWS Lambda dev should use production logging (no pretty print)
    'development': 'development',
    'test': 'test',
    'testing': 'test',
    'stage': 'staging',
    'staging': 'staging',
    'prod': 'production',
    'production': 'production',
  };

  return envMapping[env.toLowerCase()] || 'development';
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
export function errorSerializer(error: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    type: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Preserve enumerable custom properties (e.g. `code`, `statusCode`)
  for (const [key, value] of Object.entries(error)) {
    serialized[key] = value;
  }

  return serialized;
}

/**
 * Request serializer for Pino HTTP
 *
 * Serializes Express request objects
 */
export function requestSerializer(req: unknown): Record<string, unknown> {
  if (!isObjectRecord(req)) {
    return {};
  }

  const headers = isObjectRecord(req['headers']) ? req['headers'] : {};
  const connection = isObjectRecord(req['connection']) ? req['connection'] : {};

  return {
    id: req['id'],
    method: req['method'],
    url: req['url'],
    path: req['path'],
    params: isObjectRecord(req['params']) ? req['params'] : undefined,
    query: isObjectRecord(req['query']) ? req['query'] : undefined,
    headers: {
      host: typeof headers['host'] === 'string' ? headers['host'] : undefined,
      'user-agent': typeof headers['user-agent'] === 'string' ? headers['user-agent'] : undefined,
      'content-type':
        typeof headers['content-type'] === 'string' ? headers['content-type'] : undefined,
      // Don't log authorization headers
    },
    remoteAddress:
      (typeof req['ip'] === 'string' ? req['ip'] : undefined) ||
      (typeof connection['remoteAddress'] === 'string'
        ? connection['remoteAddress']
        : undefined),
  };
}

/**
 * Response serializer for Pino HTTP
 *
 * Serializes Express response objects
 */
export function responseSerializer(res: unknown): Record<string, unknown> {
  if (!isObjectRecord(res)) {
    return {};
  }

  const headers = isObjectRecord(res['headers']) ? res['headers'] : {};

  return {
    statusCode: res['statusCode'],
    headers: {
      'content-type':
        typeof headers['content-type'] === 'string' ? headers['content-type'] : undefined,
      'content-length':
        typeof headers['content-length'] === 'string' ? headers['content-length'] : undefined,
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
  const runningInLambda = isLambda();

  return {
    level: getLogLevel(env),

    // Pretty print in development for better readability
    // But NEVER in Lambda (pino-pretty is not available there)
    ...(isDevelopment && !runningInLambda && {
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
