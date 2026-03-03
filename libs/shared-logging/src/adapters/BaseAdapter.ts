/**
 * Base adapter providing common functionality for all storage adapters
 */

import { LogStorage, StorageAdapterConfig } from '../interfaces/LogStorage';
import { LogEntry } from '../interfaces/LogEntry';

/**
 * Resolved configuration with all required properties
 */
interface ResolvedAdapterConfig {
  name: string;
  enabled: boolean;
  timeout: number;
  retries: number;
}

/**
 * Base adapter class with common functionality
 *
 * Provides basic configuration and utility methods that can be
 * inherited by concrete adapter implementations.
 */
export abstract class BaseAdapter implements LogStorage {
  abstract readonly name: string;
  protected readonly config: ResolvedAdapterConfig;

  constructor(config: Partial<StorageAdapterConfig>) {
    this.config = {
      name: config.name ?? 'unknown',
      enabled: config.enabled !== false,
      timeout: config.timeout ?? 5000,
      retries: config.retries ?? 3,
    };
  }

  /**
   * Check if adapter is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Abstract write method - must be implemented by concrete adapters
   */
  abstract write(logs: LogEntry[]): Promise<void>;

  /**
   * Abstract flush method - must be implemented by concrete adapters
   */
  abstract flush(): Promise<void>;

  /**
   * Abstract health check - must be implemented by concrete adapters
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Retry a function with exponential backoff
   *
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @returns Result of the function
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms, etc.
          const delayMs = 100 * Math.pow(2, attempt);
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error('Retry failed with no error');
  }

  /**
   * Delay execution
   *
   * @param ms - Milliseconds to delay
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log an error (uses console.error as fallback)
   */
  protected logError(...args: unknown[]): void {
    console.error(`[${this.name}]`, ...args);
  }

  /**
   * Log info (uses console.log as fallback)
   */
  protected logInfo(...args: unknown[]): void {
    console.log(`[${this.name}]`, ...args);
  }
}
