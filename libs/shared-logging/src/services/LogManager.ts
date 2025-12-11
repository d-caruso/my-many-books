/**
 * LogManager - Multi-adapter coordinator for log storage
 *
 * Manages multiple storage adapters and provides fan-out writes,
 * graceful degradation, and circuit breaker protection.
 */

import { LogStorage } from '../interfaces/LogStorage';
import { LogEntry } from '../interfaces/LogEntry';

/**
 * Configuration options for LogManager
 */
export interface LogManagerOptions {
  /**
   * Default timeout for write operations (milliseconds)
   * @default 5000
   */
  defaultTimeout?: number;

  /**
   * Number of consecutive failures before circuit breaker opens
   * @default 3
   */
  circuitBreakerThreshold?: number;

  /**
   * Time to wait before attempting to close circuit breaker (milliseconds)
   * @default 60000
   */
  circuitBreakerResetTimeout?: number;

  /**
   * Enable verbose error logging
   * @default false
   */
  verboseErrors?: boolean;
}

/**
 * Circuit breaker state for an adapter
 */
interface CircuitBreakerState {
  failures: number;
  isOpen: boolean;
  lastFailureTime?: number;
}

/**
 * LogManager coordinates multiple storage adapters
 *
 * Features:
 * - Fan-out writes to all adapters
 * - Graceful degradation (continues even if adapters fail)
 * - Circuit breaker protection
 * - Timeout protection
 * - Health monitoring
 */
export class LogManager {
  private readonly options: Required<LogManagerOptions>;
  private readonly circuitBreakers: Map<string, CircuitBreakerState>;

  /**
   * Create a new LogManager
   *
   * @param adapters - Array of storage adapters to manage
   * @param options - Configuration options
   */
  constructor(
    private readonly adapters: LogStorage[],
    options: LogManagerOptions = {}
  ) {
    this.options = {
      defaultTimeout: options.defaultTimeout ?? 5000,
      circuitBreakerThreshold: options.circuitBreakerThreshold ?? 3,
      circuitBreakerResetTimeout: options.circuitBreakerResetTimeout ?? 60000,
      verboseErrors: options.verboseErrors ?? false,
    };

    this.circuitBreakers = new Map();
    this.adapters.forEach((adapter) => {
      this.circuitBreakers.set(adapter.name, {
        failures: 0,
        isOpen: false,
      });
    });
  }

  /**
   * Write a log entry to all adapters
   *
   * Writes are fan-out and non-blocking. Failures are logged but
   * don't throw errors (graceful degradation).
   *
   * @param log - Log entry to write
   */
  async write(log: LogEntry): Promise<void> {
    await this.writeMany([log]);
  }

  /**
   * Write multiple log entries to all adapters
   *
   * @param logs - Array of log entries to write
   */
  async writeMany(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    // Fan out to all adapters in parallel
    const results = await Promise.allSettled(
      this.adapters
        .filter((adapter) => !this.isCircuitBreakerOpen(adapter.name))
        .map((adapter) => this.writeWithTimeout(adapter, logs))
    );

    // Process results - log failures but don't throw
    results.forEach((result, idx) => {
      const adapter = this.adapters[idx];
      if (!adapter) return;

      if (result.status === 'rejected') {
        this.recordFailure(adapter.name, result.reason);
      } else {
        this.recordSuccess(adapter.name);
      }
    });
  }

  /**
   * Get a specific adapter by name
   *
   * @param name - Adapter name
   * @returns Adapter or undefined if not found
   */
  getAdapter(name: string): LogStorage | undefined {
    return this.adapters.find((a) => a.name === name);
  }

  /**
   * Check health of all adapters
   *
   * @returns Map of adapter names to health status
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      this.adapters.map(async (adapter) => {
        try {
          const isHealthy = await this.withTimeout(
            adapter.healthCheck(),
            this.options.defaultTimeout
          );
          results.set(adapter.name, isHealthy);
        } catch {
          // Health check failed - mark as unhealthy
          results.set(adapter.name, false);
        }
      })
    );

    return results;
  }

  /**
   * Flush all adapters
   */
  async flush(): Promise<void> {
    await Promise.allSettled(
      this.adapters.map((adapter) =>
        this.withTimeout(adapter.flush(), this.options.defaultTimeout)
      )
    );
  }

  /**
   * Get circuit breaker status for all adapters
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Write to adapter with timeout protection
   */
  private async writeWithTimeout(
    adapter: LogStorage,
    logs: LogEntry[]
  ): Promise<void> {
    try {
      await this.withTimeout(adapter.write(logs), this.options.defaultTimeout);
    } catch (error) {
      throw new Error(
        `Adapter ${adapter.name} write failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a promise with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Check if circuit breaker is open for an adapter
   */
  private isCircuitBreakerOpen(adapterName: string): boolean {
    const state = this.circuitBreakers.get(adapterName);
    if (!state || !state.isOpen) return false;

    // Check if we should attempt to close the circuit breaker
    const now = Date.now();
    const timeSinceLastFailure = now - (state.lastFailureTime ?? 0);

    if (timeSinceLastFailure >= this.options.circuitBreakerResetTimeout) {
      // Attempt to reset
      state.isOpen = false;
      state.failures = 0;
      return false;
    }

    return true;
  }

  /**
   * Record a failure for an adapter
   */
  private recordFailure(adapterName: string, error: any): void {
    const state = this.circuitBreakers.get(adapterName);
    if (!state) return;

    state.failures++;
    state.lastFailureTime = Date.now();

    // Open circuit breaker if threshold reached
    if (state.failures >= this.options.circuitBreakerThreshold) {
      state.isOpen = true;
      this.logError(
        `Circuit breaker opened for adapter ${adapterName} after ${state.failures} consecutive failures`
      );
    }

    if (this.options.verboseErrors) {
      this.logError(
        `Adapter ${adapterName} failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Record a success for an adapter
   */
  private recordSuccess(adapterName: string): void {
    const state = this.circuitBreakers.get(adapterName);
    if (!state) return;

    // Reset failure count on success
    state.failures = 0;
    if (state.isOpen) {
      state.isOpen = false;
      this.logInfo(`Circuit breaker closed for adapter ${adapterName}`);
    }
  }

  /**
   * Log an error (uses console.error as fallback)
   */
  private logError(...args: any[]): void {
    // eslint-disable-next-line no-console
    console.error('[LogManager]', ...args);
  }

  /**
   * Log an info message (uses console.log as fallback)
   */
  private logInfo(...args: any[]): void {
    // eslint-disable-next-line no-console
    console.log('[LogManager]', ...args);
  }
}
