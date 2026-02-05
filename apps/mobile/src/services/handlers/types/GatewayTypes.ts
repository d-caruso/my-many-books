/**
 * Gateway Configuration Types
 * 
 * Configuration for different handler behaviors including
 * network state handling and retry policies
 */

import { HandlerStrategy } from './HandlerTypes';
import { API_BASE_URL } from '../../../config/api';

/**
 * Gateway configuration for handler behavior
 */
export interface GatewayConfig {
  /** Base API URL */
  baseURL: string;
  /** Default timeout in milliseconds */
  timeout: number;
  /** Default retry attempts */
  retryAttempts: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Enable request/response logging */
  enableLogging: boolean;
  /** Headers to include with all requests */
  defaultHeaders: Record<string, string>;
  /** Network state configuration */
  networkConfig: NetworkConfig;
  /** Queue configuration */
  queueConfig: QueueConfig;
}

/**
 * Network state configuration
 */
export interface NetworkConfig {
  /** Timeout for network reachability check */
  reachabilityTimeout: number;
  /** URL to check for internet connectivity */
  connectivityCheckURL: string;
  /** Interval for network state polling */
  pollInterval: number;
  /** Enable automatic retry on network recovery */
  autoRetryOnRecovery: boolean;
  /** Connection types that are considered online */
  onlineConnectionTypes: string[];
}

/**
 * Queue configuration for offline operations
 */
export interface QueueConfig {
  /** Maximum queue size */
  maxQueueSize: number;
  /** Queue persistence strategy */
  persistenceStrategy: 'memory' | 'sqlite' | 'asyncstorage';
  /** Auto-sync interval when online */
  autoSyncInterval: number;
  /** Enable queue compression */
  enableCompression: boolean;
  /** Maximum age for queued operations (ms) */
  maxOperationAge: number;
  /** Batch size for sync operations */
  syncBatchSize: number;
}

/**
 * Strategy-specific configuration
 */
export interface StrategyConfig {
  /** Handler strategy */
  strategy: HandlerStrategy;
  /** Strategy-specific options */
  options: ClientGatewayOptions | MobileHandlerOptions | QueueHandlerOptions;
}

/**
 * Client Gateway specific options
 */
export interface ClientGatewayOptions {
  /** Fail immediately on network errors */
  failFast: boolean;
  /** Cache successful responses */
  enableCaching: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL: number;
  /** Validate responses against schema */
  validateResponses: boolean;
}

/**
 * Mobile Handler specific options
 */
export interface MobileHandlerOptions {
  /** Enable optimistic updates */
  optimisticUpdates: boolean;
  /** Fallback to cache when offline */
  offlineCacheFallback: boolean;
  /** Retry failed operations on network recovery */
  retryOnRecovery: boolean;
  /** Maximum time to wait before queueing (ms) */
  queueTimeout: number;
  /** Show user notifications for queued operations */
  notifyOnQueue: boolean;
}

/**
 * Queue Handler specific options
 */
export interface QueueHandlerOptions {
  /** Generate optimistic IDs */
  generateOptimisticIds: boolean;
  /** ID generation strategy */
  idGenerationStrategy: 'uuid' | 'timestamp' | 'sequential';
  /** Validate operations before queueing */
  validateBeforeQueue: boolean;
  /** Enable operation deduplication */
  deduplicateOperations: boolean;
  /** Conflict resolution strategy */
  conflictResolution: 'last-write-wins' | 'manual' | 'merge';
}

/**
 * Request configuration for individual operations
 */
export interface RequestConfig {
  /** Override default timeout */
  timeout?: number;
  /** Override retry attempts */
  retryAttempts?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request priority */
  priority?: 'low' | 'normal' | 'high';
  /** Cache strategy for this request */
  cache?: 'no-cache' | 'cache-first' | 'network-first';
  /** Force strategy override */
  forceStrategy?: HandlerStrategy;
}

/**
 * Response configuration
 */
export interface ResponseConfig {
  /** Expected response format */
  format: 'json' | 'text' | 'blob' | 'arraybuffer';
  /** Response validation schema */
  schema?: unknown;
  /** Transform response data */
  transform?: (data: unknown) => unknown;
  /** Custom error handling */
  errorHandler?: (error: Error) => Error;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Base delay between retries (ms) */
  baseDelay: number;
  /** Backoff strategy */
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Jitter factor for retry delays */
  jitter: number;
  /** Conditions that trigger retry */
  retryConditions: RetryCondition[];
}

/**
 * Retry condition
 */
export interface RetryCondition {
  /** HTTP status codes to retry */
  statusCodes?: number[];
  /** Error types to retry */
  errorTypes?: string[];
  /** Network errors to retry */
  networkErrors?: boolean;
  /** Custom retry predicate */
  predicate?: (error: Error) => boolean;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  /** Authentication type */
  type: 'bearer' | 'basic' | 'custom';
  /** Token provider function */
  tokenProvider?: () => Promise<string>;
  /** Custom auth header name */
  headerName?: string;
  /** Auth token refresh configuration */
  refresh?: {
    /** Refresh threshold (seconds before expiry) */
    threshold: number;
    /** Refresh endpoint */
    endpoint: string;
    /** Auto-refresh enabled */
    autoRefresh: boolean;
  };
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Log requests */
  logRequests: boolean;
  /** Log responses */
  logResponses: boolean;
  /** Log queue operations */
  logQueueOps: boolean;
  /** Log network state changes */
  logNetworkState: boolean;
  /** Custom logger */
  logger?: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enabled: boolean;
  /** Sample rate (0-1) */
  sampleRate: number;
  /** Metrics to collect */
  metrics: PerformanceMetric[];
  /** Performance data callback */
  onMetrics?: (metrics: PerformanceData) => void;
}

/**
 * Performance metrics to collect
 */
export type PerformanceMetric = 
  | 'request-duration'
  | 'queue-size'
  | 'sync-duration'
  | 'cache-hit-rate'
  | 'network-latency'
  | 'error-rate';

/**
 * Performance data
 */
export interface PerformanceData {
  /** Metric name */
  metric: PerformanceMetric;
  /** Metric value */
  value: number;
  /** Timestamp */
  timestamp: Date;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Complete gateway configuration
 */
export interface CompleteGatewayConfig extends GatewayConfig {
  /** Authentication configuration */
  auth?: AuthConfig;
  /** Logging configuration */
  logging?: LoggingConfig;
  /** Performance monitoring */
  performance?: PerformanceConfig;
  /** Strategy configurations */
  strategies: Record<HandlerStrategy, StrategyConfig>;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Environment name */
  environment: 'development' | 'staging' | 'production';
  /** API base URL for this environment */
  apiBaseURL: string;
  /** Enable debug features */
  debugMode: boolean;
  /** Configuration overrides */
  overrides: Partial<CompleteGatewayConfig>;
}

/**
 * Default configuration values
 */
export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: __DEV__,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  networkConfig: {
    reachabilityTimeout: 5000,
    connectivityCheckURL: 'https://www.google.com',
    pollInterval: 30000,
    autoRetryOnRecovery: true,
    onlineConnectionTypes: ['wifi', 'cellular'],
  },
  queueConfig: {
    maxQueueSize: 1000,
    persistenceStrategy: 'sqlite',
    autoSyncInterval: 60000,
    enableCompression: false,
    maxOperationAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    syncBatchSize: 10,
  },
};
