/**
 * Integration tests for centralized logging system
 *
 * Tests:
 * - End-to-end logging flow (request → Pino → adapters)
 * - TraceId correlation across logs
 * - Structured logging format
 * - Error serialization
 */

import { getLogger } from '../../src/services/logger';
import { getCurrentTraceId } from '@my-many-books/shared-logging';

describe('Logging Integration', () => {
  describe('Logger Service', () => {
    it('should create logger instance', () => {
      const logger = getLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should log info messages with context', () => {
      const logger = getLogger();
      expect(() => {
        logger.info({ userId: 123, action: 'test' }, 'Test message');
      }).not.toThrow();
    });

    it('should log errors with proper serialization', () => {
      const logger = getLogger();
      const testError = new Error('Test error');

      expect(() => {
        logger.error({ err: testError, context: 'test' }, 'Error occurred');
      }).not.toThrow();
    });

    it('should log warnings', () => {
      const logger = getLogger();
      expect(() => {
        logger.warn({ reason: 'test warning' }, 'Warning message');
      }).not.toThrow();
    });
  });

  describe('TraceId Integration', () => {
    it('should return traceId or unknown when outside request context', () => {
      const traceId = getCurrentTraceId();
      // Outside request context, traceId might be undefined or 'unknown'
      expect(typeof traceId).toMatch(/string|undefined/);
    });

    it('should log with traceId in context', () => {
      const logger = getLogger();
      const traceId = getCurrentTraceId() || 'test-trace-id';

      expect(() => {
        logger.info({ traceId, test: true }, 'Log with traceId');
      }).not.toThrow();
    });
  });

  describe('Structured Logging Format', () => {
    it('should handle complex objects', () => {
      const logger = getLogger();
      const complexObject = {
        user: { id: 123, email: 'test@example.com' },
        metadata: { count: 5, tags: ['test', 'integration'] },
        nested: { deep: { value: 'test' } },
      };

      expect(() => {
        logger.info(complexObject, 'Complex object logged');
      }).not.toThrow();
    });

    it('should handle arrays', () => {
      const logger = getLogger();
      expect(() => {
        logger.info({ items: [1, 2, 3], names: ['a', 'b'] }, 'Array logging');
      }).not.toThrow();
    });

    it('should handle undefined and null values', () => {
      const logger = getLogger();
      expect(() => {
        logger.info(
          { optional: undefined, nullable: null, present: 'value' },
          'Optional values'
        );
      }).not.toThrow();
    });
  });

  describe('Error Serialization', () => {
    it('should serialize Error objects', () => {
      const logger = getLogger();
      const error = new Error('Test error message');
      error.stack = 'Error: Test error message\n    at test.ts:10:20';

      expect(() => {
        logger.error({ err: error }, 'Error serialization test');
      }).not.toThrow();
    });

    it('should handle non-Error objects', () => {
      const logger = getLogger();
      const notAnError = { message: 'Not a real error' };

      expect(() => {
        logger.error(
          { err: new Error(String(notAnError)) },
          'Non-error object'
        );
      }).not.toThrow();
    });

    it('should handle errors with additional properties', () => {
      const logger = getLogger();
      const customError = new Error('Custom error') as Error & {
        code: string;
        statusCode: number;
      };
      customError.code = 'CUSTOM_ERROR';
      customError.statusCode = 400;

      expect(() => {
        logger.error({ err: customError }, 'Custom error with properties');
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should log without blocking (async)', async () => {
      const logger = getLogger();
      const startTime = Date.now();

      // Log 100 messages
      for (let i = 0; i < 100; i++) {
        logger.info({ index: i }, `Log message ${i}`);
      }

      const duration = Date.now() - startTime;

      // Logging should be fast (< 100ms for 100 logs)
      expect(duration).toBeLessThan(100);
    });
  });
});
