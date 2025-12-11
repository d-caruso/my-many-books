/**
 * @my-many-books/shared-logging
 *
 * Unified logging infrastructure with pluggable storage adapters
 */

// Interfaces
export * from './interfaces/LogStorage';
export * from './interfaces/LogEntry';

// Adapters
export * from './adapters/BaseAdapter';

// Services
export * from './services/LogManager';

// Config
export * from './config/pinoConfig';
export * from './config/redactionRules';

// Middleware
export * from './middleware/requestLogger';
export * from './middleware/traceIdGenerator';
