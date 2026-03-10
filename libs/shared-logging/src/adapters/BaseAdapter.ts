/**
 * Base adapter providing common functionality for all storage adapters
 */

import { LogStorage, StorageAdapterConfig } from '../interfaces/LogStorage';
import { LogEntry } from '../interfaces/LogEntry';
import { getLogger } from '../services/logger';

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

  private formatLogPayload(args: unknown[]): { message: string; details?: unknown[] } {
    if (args.length === 0) {
      return { message: 'Adapter log event' };
    }

    const [first, ...rest] = args;
    if (typeof first === 'string') {
      return rest.length > 0 ? { message: first, details: rest } : { message: first };
    }

    return {
      message: 'Adapter log event',
      details: args,
    };
  }

  /**
   * Log an error through shared logger
   */
  protected logError(...args: unknown[]): void {
    const payload = this.formatLogPayload(args);
    getLogger().error(
      payload.details ? { adapter: this.name, details: payload.details } : { adapter: this.name },
      payload.message
    );
  }

  /**
   * Log info through shared logger
   */
  protected logInfo(...args: unknown[]): void {
    const payload = this.formatLogPayload(args);
    getLogger().info(
      payload.details ? { adapter: this.name, details: payload.details } : { adapter: this.name },
      payload.message
    );
  }
}
