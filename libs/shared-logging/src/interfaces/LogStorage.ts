/**
 * Storage adapter interface for pluggable log backends
 */

import { LogEntry, LogFilter } from './LogEntry';

/**
 * Interface that all log storage adapters must implement
 *
 * This enables the adapter pattern for supporting multiple
 * storage backends (CloudWatch, Database, S3, Loki, etc.)
 */
export interface LogStorage {
  /**
   * Unique name identifier for this adapter
   */
  readonly name: string;

  /**
   * Write one or more log entries to storage
   *
   * @param logs - Array of log entries to persist
   * @returns Promise that resolves when write completes
   * @throws Error if write fails
   */
  write(logs: LogEntry[]): Promise<void>;

  /**
   * Query logs matching the given filter criteria (optional)
   *
   * Not all adapters support querying. Adapters that don't
   * support queries should leave this undefined.
   *
   * @param filter - Filter criteria
   * @returns Promise resolving to matching log entries
   */
  query?(filter: LogFilter): Promise<LogEntry[]>;

  /**
   * Flush any buffered logs to storage
   *
   * @returns Promise that resolves when flush completes
   */
  flush(): Promise<void>;

  /**
   * Check if the storage backend is healthy and accessible
   *
   * @returns Promise resolving to true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Configuration options for storage adapters
 */
export interface StorageAdapterConfig {
  /**
   * Name for this adapter instance
   */
  name: string;

  /**
   * Enable/disable the adapter
   */
  enabled?: boolean;

  /**
   * Timeout in milliseconds for write operations
   */
  timeout?: number;

  /**
   * Number of times to retry failed operations
   */
  retries?: number;
}
