/**
 * Unit tests for LogManager
 */

import { LogManager } from '../../services/LogManager';
import { LogStorage } from '../../interfaces/LogStorage';
import { LogEntry } from '../../interfaces/LogEntry';

// Mock adapter implementation
class MockAdapter implements LogStorage {
  name: string;
  writeCalls: LogEntry[][] = [];
  healthCheckResult = true;
  shouldFail = false;
  writeDelay = 0;

  constructor(name: string) {
    this.name = name;
  }

  async write(logs: LogEntry[]): Promise<void> {
    if (this.writeDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.writeDelay));
    }

    if (this.shouldFail) {
      throw new Error(`Mock ${this.name} write failed`);
    }

    this.writeCalls.push(logs);
  }

  async flush(): Promise<void> {
    // No-op for mock
  }

  async healthCheck(): Promise<boolean> {
    return this.healthCheckResult;
  }

  reset(): void {
    this.writeCalls = [];
    this.shouldFail = false;
    this.writeDelay = 0;
  }
}

describe('LogManager', () => {
  let mockAdapter1: MockAdapter;
  let mockAdapter2: MockAdapter;
  let logManager: LogManager;

  const createMockLog = (message: string): LogEntry => ({
    timestamp: new Date(),
    level: 'info',
    message,
    traceId: 'test-trace-id',
    service: 'test-service',
    metadata: {},
  });

  beforeEach(() => {
    mockAdapter1 = new MockAdapter('adapter1');
    mockAdapter2 = new MockAdapter('adapter2');
    logManager = new LogManager([mockAdapter1, mockAdapter2], {
      defaultTimeout: 1000,
      circuitBreakerThreshold: 3,
      verboseErrors: false,
    });
  });

  describe('write', () => {
    it('should fan out logs to all adapters', async () => {
      const log = createMockLog('test message');

      await logManager.write(log);

      expect(mockAdapter1.writeCalls).toHaveLength(1);
      expect(mockAdapter1.writeCalls[0]).toEqual([log]);
      expect(mockAdapter2.writeCalls).toHaveLength(1);
      expect(mockAdapter2.writeCalls[0]).toEqual([log]);
    });

    it('should continue writing to other adapters if one fails (graceful degradation)', async () => {
      mockAdapter1.shouldFail = true;
      const log = createMockLog('test message');

      await logManager.write(log);

      // Adapter1 failed but adapter2 should still receive the log
      expect(mockAdapter1.writeCalls).toHaveLength(0);
      expect(mockAdapter2.writeCalls).toHaveLength(1);
      expect(mockAdapter2.writeCalls[0]).toEqual([log]);
    });

    it('should handle multiple logs with writeMany', async () => {
      const logs = [
        createMockLog('message 1'),
        createMockLog('message 2'),
        createMockLog('message 3'),
      ];

      await logManager.writeMany(logs);

      expect(mockAdapter1.writeCalls).toHaveLength(1);
      expect(mockAdapter1.writeCalls[0]).toEqual(logs);
      expect(mockAdapter2.writeCalls).toHaveLength(1);
      expect(mockAdapter2.writeCalls[0]).toEqual(logs);
    });

    it('should not write if logs array is empty', async () => {
      await logManager.writeMany([]);

      expect(mockAdapter1.writeCalls).toHaveLength(0);
      expect(mockAdapter2.writeCalls).toHaveLength(0);
    });
  });

  describe('timeout protection', () => {
    it('should timeout slow writes', async () => {
      mockAdapter1.writeDelay = 2000; // Longer than timeout (1000ms)
      const log = createMockLog('test message');

      await logManager.write(log);

      // Adapter1 should have timed out (no successful write)
      expect(mockAdapter1.writeCalls).toHaveLength(0);
      // Adapter2 should still succeed
      expect(mockAdapter2.writeCalls).toHaveLength(1);
    });

    it('should complete fast writes before timeout', async () => {
      mockAdapter1.writeDelay = 100; // Much faster than timeout
      const log = createMockLog('test message');

      await logManager.write(log);

      expect(mockAdapter1.writeCalls).toHaveLength(1);
      expect(mockAdapter2.writeCalls).toHaveLength(1);
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      mockAdapter1.shouldFail = true;
      const log = createMockLog('test message');

      // Trigger failures up to threshold (3)
      await logManager.write(log);
      await logManager.write(log);
      await logManager.write(log);

      const status = logManager.getCircuitBreakerStatus();
      const adapter1Status = status.get('adapter1');

      expect(adapter1Status).toBeDefined();
      expect(adapter1Status?.isOpen).toBe(true);
      expect(adapter1Status?.failures).toBeGreaterThanOrEqual(3);
    });

    it('should not write to adapter when circuit breaker is open', async () => {
      mockAdapter1.shouldFail = true;
      const log = createMockLog('test message');

      // Open circuit breaker
      await logManager.write(log);
      await logManager.write(log);
      await logManager.write(log);

      // Try to write again - should skip adapter1
      mockAdapter1.reset();
      await logManager.write(log);

      // Adapter1 should not have received the write (circuit is open)
      expect(mockAdapter1.writeCalls).toHaveLength(0);
      // Adapter2 should still work
      expect(mockAdapter2.writeCalls).toHaveLength(4); // 3 from failures + 1 from final write
    });

    it('should reset circuit breaker on successful write', async () => {
      mockAdapter1.shouldFail = true;
      const log = createMockLog('test message');

      // Cause some failures (but not enough to open circuit)
      await logManager.write(log);
      await logManager.write(log);

      // Fix adapter and write successfully
      mockAdapter1.shouldFail = false;
      mockAdapter1.reset();
      await logManager.write(log);

      const status = logManager.getCircuitBreakerStatus();
      const adapter1Status = status.get('adapter1');

      expect(adapter1Status?.failures).toBe(0);
      expect(adapter1Status?.isOpen).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return health status for all adapters', async () => {
      const health = await logManager.healthCheck();

      expect(health.size).toBe(2);
      expect(health.get('adapter1')).toBe(true);
      expect(health.get('adapter2')).toBe(true);
    });

    it('should detect unhealthy adapters', async () => {
      mockAdapter1.healthCheckResult = false;

      const health = await logManager.healthCheck();

      expect(health.get('adapter1')).toBe(false);
      expect(health.get('adapter2')).toBe(true);
    });
  });

  describe('getAdapter', () => {
    it('should return adapter by name', () => {
      const adapter = logManager.getAdapter('adapter1');

      expect(adapter).toBe(mockAdapter1);
    });

    it('should return undefined for non-existent adapter', () => {
      const adapter = logManager.getAdapter('nonexistent');

      expect(adapter).toBeUndefined();
    });
  });

  describe('flush', () => {
    it('should flush all adapters', async () => {
      const flushSpy1 = jest.spyOn(mockAdapter1, 'flush');
      const flushSpy2 = jest.spyOn(mockAdapter2, 'flush');

      await logManager.flush();

      expect(flushSpy1).toHaveBeenCalled();
      expect(flushSpy2).toHaveBeenCalled();
    });
  });
});
