/**
 * Performance Benchmarks for Handler Patterns
 * Tests performance characteristics of all three handler strategies
 */

import {
  createQueueHandler,
  createDefaultQueueHandlerConfig, 
  QueueHandlerFactory
} from '../../../../services/handlers/gateways/queueHandler';

import { 
  createClientGateway,
  createDefaultClientGatewayConfig
} from '../../../../services/handlers/gateways/clientGateway';

import { 
  QueueHandlerType,
  ClientGatewayHandler,
  CreatePayload
} from '../../../../services/handlers/types/HandlerTypes';

// Test book type
interface TestBook {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed';
  creationDate: string;
  updateDate: string;
}

// HTTP client mock optimized for performance testing
interface HttpClient {
  get<T>(url: string, config?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: Record<string, unknown>, config?: Record<string, unknown>): Promise<T>;
  put<T>(url: string, data?: Record<string, unknown>, config?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string, config?: Record<string, unknown>): Promise<T>;
}

const createOptimizedMockHttpClient = (): HttpClient => ({
  get: jest.fn().mockImplementation(() => Promise.resolve({})),
  post: jest.fn().mockImplementation(() => Promise.resolve({ id: Date.now().toString() })),
  put: jest.fn().mockImplementation(() => Promise.resolve({})),
  delete: jest.fn().mockImplementation(() => Promise.resolve({}))
});

describe('Handler Performance Benchmarks', () => {
  // Global cleanup before all performance tests
  beforeAll(async () => {
    const globalConfig = createDefaultQueueHandlerConfig('book');
    await globalConfig.queue.clear();
  });

  describe('QueueHandler Performance', () => {
    let queueHandler: QueueHandlerType<TestBook>;
    let queueConfig: ReturnType<typeof createDefaultQueueHandlerConfig>;

    beforeEach(async () => {
      queueConfig = createDefaultQueueHandlerConfig('book');
      queueHandler = createQueueHandler<TestBook>('book', queueConfig);
      await queueConfig.queue.clear();
    });

    it('should handle 100 concurrent operations efficiently', async () => {
      const startTime = Date.now();
      const operations = Array.from({ length: 100 }, (_, i) =>
        queueHandler.create({
          title: `Performance Book ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // Performance assertions
      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Memory efficiency - all IDs should be unique
      const uniqueIds = new Set(results);
      expect(uniqueIds.size).toBe(100);

      // Queue should contain all operations
      expect(queueConfig.queue.size()).toBe(100);

      console.log(`QueueHandler: 100 operations completed in ${duration}ms`);
    }, 10000); // 10 second timeout

    it('should scale linearly with operation count', async () => {
      const testSizes = [10, 50, 100];
      const results: { size: number; duration: number; throughput: number }[] = [];

      for (const size of testSizes) {
        await queueConfig.queue.clear();
        
        const startTime = Date.now();
        const operations = Array.from({ length: size }, (_, i) =>
          queueHandler.create({
            title: `Scale Test ${i}`,
            author: `Author ${i}`,
            status: 'reading'
          })
        );

        await Promise.all(operations);
        const duration = Math.max(Date.now() - startTime, 1); // Ensure minimum 1ms
        const throughput = size / (duration / 1000); // operations per second

        results.push({ size, duration, throughput });
        console.log(`QueueHandler: ${size} operations in ${duration}ms (${throughput.toFixed(2)} ops/sec)`);
      }

      // Check that throughput doesn't degrade significantly
      const [small, medium, large] = results;
      expect(large.throughput).toBeGreaterThan(small.throughput * 0.7); // Allow some degradation
      expect(medium.throughput).toBeGreaterThan(small.throughput * 0.8);
    }, 15000);

    it('should maintain memory efficiency under load', async () => {
      const memoryBefore = process.memoryUsage();
      
      // Create many operations
      const operations = Array.from({ length: 500 }, (_, i) =>
        queueHandler.create({
          title: `Memory Test ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      await Promise.all(operations);
      
      const memoryAfter = process.memoryUsage();
      const heapDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const heapDiffMB = heapDiff / 1024 / 1024;

      console.log(`QueueHandler memory usage: ${heapDiffMB.toFixed(2)}MB for 500 operations`);
      
      // Should not use excessive memory (less than 15MB for 500 operations, allowing for optimization caches)
      expect(heapDiffMB).toBeLessThan(15);
      
      // Clean up
      await queueConfig.queue.clear();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }, 10000);
  });

  describe('ClientGateway Performance', () => {
    let clientGateway: ClientGatewayHandler<TestBook>;
    let mockHttpClient: HttpClient;

    beforeEach(() => {
      // Ensure navigator.onLine is true for ClientGateway tests
      Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true, writable: true });
      
      mockHttpClient = createOptimizedMockHttpClient();
      const config = createDefaultClientGatewayConfig(mockHttpClient);
      clientGateway = createClientGateway<TestBook>('book', config);
    });

    it('should handle HTTP operations efficiently', async () => {
      const startTime = Date.now();
      const operations = Array.from({ length: 50 }, (_, i) =>
        clientGateway.create({
          title: `HTTP Test ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should be faster than queue operations

      console.log(`ClientGateway: 50 HTTP operations completed in ${duration}ms`);
    }, 5000);

    it('should have minimal memory overhead', async () => {
      const memoryBefore = process.memoryUsage();
      
      // Create many HTTP operations
      const operations = Array.from({ length: 100 }, (_, i) =>
        clientGateway.create({
          title: `Memory Test ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      await Promise.all(operations);
      
      const memoryAfter = process.memoryUsage();
      const heapDiff = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const heapDiffMB = heapDiff / 1024 / 1024;

      console.log(`ClientGateway memory usage: ${heapDiffMB.toFixed(2)}MB for 100 operations`);
      
      // Should use less memory than QueueHandler (no queue storage)
      expect(heapDiffMB).toBeLessThan(5);
    }, 5000);
  });

  describe('Handler Strategy Comparison', () => {
    let queueHandler: QueueHandlerType<TestBook>;
    let clientGateway: ClientGatewayHandler<TestBook>;
    let queueConfig: ReturnType<typeof createDefaultQueueHandlerConfig>;

    beforeEach(async () => {
      // Setup QueueHandler
      queueConfig = createDefaultQueueHandlerConfig('book');
      queueHandler = createQueueHandler<TestBook>('book', queueConfig);
      await queueConfig.queue.clear();

      // Setup ClientGateway
      Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true, writable: true });
      const mockHttpClient = createOptimizedMockHttpClient();
      const clientConfig = createDefaultClientGatewayConfig(mockHttpClient);
      clientGateway = createClientGateway<TestBook>('book', clientConfig);
    });

    it('should compare performance characteristics', async () => {
      const testData: CreatePayload<TestBook> = {
        title: 'Comparison Test',
        author: 'Test Author',
        status: 'reading'
      };

      // Test QueueHandler performance
      const queueStartTime = Date.now();
      const queueOperations = Array.from({ length: 50 }, () =>
        queueHandler.create(testData)
      );
      await Promise.all(queueOperations);
      const queueDuration = Date.now() - queueStartTime;

      // Test ClientGateway performance  
      const clientStartTime = Date.now();
      const clientOperations = Array.from({ length: 50 }, () =>
        clientGateway.create(testData)
      );
      await Promise.all(clientOperations);
      const clientDuration = Date.now() - clientStartTime;

      console.log(`Performance comparison for 50 operations:`);
      console.log(`  QueueHandler: ${queueDuration}ms`);
      console.log(`  ClientGateway: ${clientDuration}ms`);
      console.log(`  Ratio: ${(queueDuration / clientDuration).toFixed(2)}x`);

      // Both should complete reasonably quickly
      expect(queueDuration).toBeLessThan(3000);
      expect(clientDuration).toBeLessThan(1000);
      
      // ClientGateway should generally be faster (no queue storage)
      // But allow for some variance in test environment
      expect(clientDuration).toBeLessThanOrEqual(queueDuration * 1.5);
    }, 10000);

    it('should measure throughput under load', async () => {
      const operationCount = 200;
      const testData: CreatePayload<TestBook> = {
        title: 'Throughput Test',
        author: 'Test Author',
        status: 'reading'
      };

      // Measure QueueHandler throughput
      const queueStartTime = process.hrtime.bigint();
      const queuePromises = Array.from({ length: operationCount }, () =>
        queueHandler.create(testData)
      );
      await Promise.all(queuePromises);
      const queueEndTime = process.hrtime.bigint();
      const queueDurationNs = Number(queueEndTime - queueStartTime);
      const queueThroughput = operationCount / (queueDurationNs / 1e9);

      // Measure ClientGateway throughput
      const clientStartTime = process.hrtime.bigint();
      const clientPromises = Array.from({ length: operationCount }, () =>
        clientGateway.create(testData)
      );
      await Promise.all(clientPromises);
      const clientEndTime = process.hrtime.bigint();
      const clientDurationNs = Number(clientEndTime - clientStartTime);
      const clientThroughput = operationCount / (clientDurationNs / 1e9);

      console.log(`Throughput comparison for ${operationCount} operations:`);
      console.log(`  QueueHandler: ${queueThroughput.toFixed(2)} ops/sec`);
      console.log(`  ClientGateway: ${clientThroughput.toFixed(2)} ops/sec`);

      // Both should achieve reasonable throughput
      expect(queueThroughput).toBeGreaterThan(50); // At least 50 ops/sec
      expect(clientThroughput).toBeGreaterThan(100); // At least 100 ops/sec
    }, 15000);
  });

  describe('Factory Performance', () => {
    it('should efficiently create and manage multiple handlers', async () => {
      const startTime = Date.now();
      
      // Create multiple factories and handlers
      const factories = Array.from({ length: 10 }, () => {
        const config = createDefaultQueueHandlerConfig('book');
        return new QueueHandlerFactory(config);
      });

      const handlers = factories.map(factory => 
        factory.createBookHandler<TestBook>()
      );

      // Use all handlers concurrently
      const operations = handlers.map((handler, index) =>
        handler.create({
          title: `Factory Test ${index}`,
          author: `Author ${index}`,
          status: 'reading'
        })
      );

      await Promise.all(operations);
      
      const duration = Date.now() - startTime;
      console.log(`Factory management: 10 factories with 10 operations in ${duration}ms`);

      expect(duration).toBeLessThan(2000);
      
      // Clean up all factories
      await Promise.all(factories.map(factory => 
        Promise.resolve(factory.clearQueue())
      ));
    }, 5000);

    it('should handle factory configuration updates efficiently', () => {
      const startTime = Date.now();
      
      const factory = new QueueHandlerFactory(
        createDefaultQueueHandlerConfig('book')
      );

      // Perform many configuration updates
      for (let i = 0; i < 100; i++) {
        factory.updateConfig({
          resourceType: i % 2 === 0 ? 'book' : 'author',
          queueOptions: {
            generateOptimisticIds: i % 2 === 0,
            idGenerationStrategy: i % 3 === 0 ? 'uuid' : 'timestamp',
            validateBeforeQueue: true,
            deduplicateOperations: i % 2 === 0,
            conflictResolution: 'last-write-wins'
          }
        });
      }

      const duration = Date.now() - startTime;
      console.log(`Factory config updates: 100 updates in ${duration}ms`);

      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', async () => {
      const config = createDefaultQueueHandlerConfig('book');
      const handler = createQueueHandler<TestBook>('book', config);

      // Create many operations
      const operations = Array.from({ length: 100 }, (_, i) =>
        handler.create({
          title: `Cleanup Test ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      await Promise.all(operations);
      expect(config.queue.size()).toBe(100);

      // Clear everything
      await config.queue.clear();
      expect(config.queue.size()).toBe(0);

      // Memory should be freed (check by creating more operations)
      const newOperations = Array.from({ length: 50 }, (_, i) =>
        handler.create({
          title: `After Cleanup ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      await Promise.all(newOperations);
      expect(config.queue.size()).toBe(50);
    });
  });
});