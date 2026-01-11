// Performance impact tests for mobile operations
// Measures overhead of queue and sync operations to establish baseline

// Mock dependencies first
import { operationQueue } from '../../services/OperationQueue';
import { syncService } from '../../services/sync/SyncService';
import { OPERATION_TYPES, RESOURCE_TYPES } from '../../services/hooks/eventsSchema';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/api');
jest.mock('../../services/database/BookRepository');
jest.mock('../../services/database/AuthorRepository');
jest.mock('../../services/database/CategoryRepository');
// Import mocked services
const { bookAPI, authorAPI, categoryAPI } = require('../../services/api');
const { bookRepository } = require('../../services/database/BookRepository');
const { authorRepository } = require('../../services/database/AuthorRepository');
const { categoryRepository } = require('../../services/database/CategoryRepository');

// Performance test configuration
const PERFORMANCE_THRESHOLD_MS = 5; // Max acceptable overhead per operation
const LARGE_BATCH_SIZE = 100; // For stress testing
const ITERATIONS = 50; // For averaging measurements

// Utility function to measure execution time
const measureExecutionTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  return { result, duration: end - start };
};

// Utility to calculate statistics
const calculateStats = (durations: number[]) => {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    min: Math.min(...durations),
    max: Math.max(...durations),
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
};

describe('Mobile Operations Performance Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Reset API mocks to default behavior
    bookAPI.getBooks = jest.fn().mockResolvedValue([]);
    authorAPI.getAuthors = jest.fn().mockResolvedValue([]);
    categoryAPI.getCategories = jest.fn().mockResolvedValue([]);

    // Reset repository mocks to default behavior
    bookRepository.findByServerId = jest.fn().mockResolvedValue(null);
    bookRepository.create = jest.fn().mockResolvedValue({ id: 'mock-id' });
    bookRepository.update = jest.fn().mockResolvedValue(undefined);
    authorRepository.findByServerId = jest.fn().mockResolvedValue(null);
    authorRepository.findByName = jest.fn().mockResolvedValue(null);
    authorRepository.create = jest.fn().mockResolvedValue({ id: 1 });
    authorRepository.updateSyncFields = jest.fn().mockResolvedValue(undefined);
    categoryRepository.findByServerId = jest.fn().mockResolvedValue(null);
    categoryRepository.findByName = jest.fn().mockResolvedValue(null);
    categoryRepository.create = jest.fn().mockResolvedValue({ id: 1 });
    categoryRepository.updateSyncFields = jest.fn().mockResolvedValue(undefined);

    await operationQueue.initialize();
    await operationQueue.clear();
  });

  afterEach(async () => {
    await operationQueue.clear();
  });

  describe('Queue Operation Performance', () => {
    it('should enqueue operations efficiently', async () => {
      const durations: number[] = [];
      const payloads = Array.from({ length: ITERATIONS }, (_, i) => ({
        title: `Performance Test Book ${i}`,
        isbnCode: `978${i.toString().padStart(10, '0')}`
      }));

      // Measure enqueue performance
      for (let i = 0; i < ITERATIONS; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, payloads[i]);
        });
        durations.push(duration);
      }

      const stats = calculateStats(durations);
      
      console.log(`\n=== Queue Enqueue Performance ===`);
      console.log(`Iterations: ${ITERATIONS}`);
      console.log(`Average time: ${stats.avg.toFixed(2)}ms`);
      console.log(`95th percentile: ${stats.p95.toFixed(2)}ms`);
      console.log(`Max time: ${stats.max.toFixed(2)}ms`);

      // Performance assertions
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2);
      expect(operationQueue.size()).toEqual(ITERATIONS);
    });

    it('should handle batch queue processing efficiently', async () => {
      // Setup batch of operations
      const operations = Array.from({ length: LARGE_BATCH_SIZE }, (_, i) => ({
        title: `Batch Book ${i}`,
        isbnCode: `batch${i}`
      }));

      // Enqueue all operations first
      for (const payload of operations) {
        await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, payload);
      }

      // Measure batch processing performance
      const mockApiExecutor = jest.fn().mockResolvedValue({ id: 'server-123' });
      
      const { duration } = await measureExecutionTime(async () => {
        await operationQueue.processQueue(mockApiExecutor);
      });

      console.log(`\n=== Batch Queue Processing ===`);
      console.log(`Batch size: ${LARGE_BATCH_SIZE}`);
      console.log(`Total processing time: ${duration.toFixed(2)}ms`);
      console.log(`Time per operation: ${(duration / LARGE_BATCH_SIZE).toFixed(2)}ms`);

      // Performance assertions
      expect(duration / LARGE_BATCH_SIZE).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(mockApiExecutor).toHaveBeenCalledTimes(LARGE_BATCH_SIZE);
    });

    it('should verify queue size performance', async () => {
      const durations: number[] = [];

      // Add some items to queue
      for (let i = 0; i < 50; i++) {
        await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: `Test ${i}` });
      }

      // Measure size() performance
      for (let i = 0; i < ITERATIONS; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return operationQueue.size();
        });
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      console.log(`\n=== Queue Size Check Performance ===`);
      console.log(`Queue size: 50`);
      console.log(`Average size() time: ${stats.avg.toFixed(3)}ms`);
      console.log(`95th percentile: ${stats.p95.toFixed(3)}ms`);

      // Size check should be extremely fast
      expect(stats.avg).toBeLessThan(1); // Less than 1ms average
      expect(stats.p95).toBeLessThan(2); // Less than 2ms for 95th percentile
    });
  });

  describe('Sync Operation Performance', () => {
    it('should handle empty sync efficiently', async () => {
      const durations: number[] = [];

      // Measure empty sync performance
      for (let i = 0; i < ITERATIONS; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return await syncService.performSync();
        });
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      console.log(`\n=== Empty Sync Performance ===`);
      console.log(`Average empty sync time: ${stats.avg.toFixed(2)}ms`);
      console.log(`95th percentile: ${stats.p95.toFixed(2)}ms`);

      // Empty sync should be fast
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 5);
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 10);
    });

    it('should handle sync with data efficiently', async () => {
      // Setup test data for sync
      const testBooks = Array.from({ length: 20 }, (_, i) => ({
        id: `book-${i}`,
        title: `Performance Book ${i}`,
        updateDate: new Date().toISOString()
      }));

      bookAPI.getBooks = jest.fn().mockResolvedValue(testBooks);

      const durations: number[] = [];

      // Measure sync performance multiple times
      for (let i = 0; i < 10; i++) {
        const { duration } = await measureExecutionTime(async () => {
          return await syncService.performSync();
        });
        durations.push(duration);
      }

      const stats = calculateStats(durations);

      console.log(`\n=== Sync with Data Performance ===`);
      console.log(`Books per sync: ${testBooks.length}`);
      console.log(`Average sync time: ${stats.avg.toFixed(2)}ms`);
      console.log(`95th percentile: ${stats.p95.toFixed(2)}ms`);

      // Sync with data is more complex, higher threshold
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 20);
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 30);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not have significant memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      const operations = Array.from({ length: 1000 }, (_, i) => 
        operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
          title: `Memory Test ${i}`,
          isbnCode: `mem${i}`
        })
      );

      // Wait for operations to complete
      return Promise.all(operations).then(() => {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseKB = memoryIncrease / 1024;

        console.log(`\n=== Memory Usage Performance ===`);
        console.log(`Operations: 1000`);
        console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)} KB`);
        console.log(`Memory per operation: ${(memoryIncreaseKB / 1000).toFixed(3)} KB`);

        // Memory increase should be reasonable (adjusted for test environment overhead)
        expect(memoryIncreaseKB).toBeLessThan(25000); // Less than 25MB for 1000 operations in test env
      });
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent operations efficiently', async () => {
      const concurrentOps = 10;
      const opsPerConcurrent = 10;
      
      const startTime = performance.now();
      
      // Run multiple concurrent operation sequences
      const promises = Array.from({ length: concurrentOps }, async (_, groupIndex) => {
        const groupDurations: number[] = [];
        
        for (let i = 0; i < opsPerConcurrent; i++) {
          const { duration } = await measureExecutionTime(async () => {
            return await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
              title: `Concurrent Book ${groupIndex}-${i}`
            });
          });
          groupDurations.push(duration);
        }
        
        return groupDurations;
      });

      const allResults = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const allDurations = allResults.flat();
      const stats = calculateStats(allDurations);
      
      console.log(`\n=== Concurrent Operations Performance ===`);
      console.log(`Concurrent groups: ${concurrentOps}`);
      console.log(`Operations per group: ${opsPerConcurrent}`);
      console.log(`Total operations: ${allDurations.length}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average per operation: ${stats.avg.toFixed(2)}ms`);
      console.log(`95th percentile: ${stats.p95.toFixed(2)}ms`);

      // Concurrent operations should still be fast
      expect(stats.avg).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 3);
      expect(stats.p95).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 6);
      expect(operationQueue.size()).toEqual(allDurations.length);
    });
  });

  describe('Stress Test Performance', () => {
    it('should handle queue at capacity efficiently', async () => {
      const QUEUE_CAPACITY = 100; // Max queue size limit
      const durations: number[] = [];

      console.log(`\n=== Stress Test Performance (${QUEUE_CAPACITY} operations) ===`);
      
      // Measure time for each batch of 50 operations
      for (let batch = 0; batch < QUEUE_CAPACITY / 50; batch++) {
        const { duration } = await measureExecutionTime(async () => {
          for (let i = 0; i < 50; i++) {
            await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
              title: `Stress Test ${batch * 50 + i}`
            });
          }
        });
        durations.push(duration);
        
        console.log(`Batch ${batch + 1}/2: ${duration.toFixed(2)}ms (50 ops)`);
      }

      const stats = calculateStats(durations);

      console.log(`Average batch time: ${stats.avg.toFixed(2)}ms`);
      console.log(`Time per operation: ${(stats.avg / 50).toFixed(3)}ms`);
      console.log(`Queue size: ${operationQueue.size()}`);

      // Stress test should still maintain performance
      expect(stats.avg / 50).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(operationQueue.size()).toEqual(QUEUE_CAPACITY);
    });

    it('should handle queue overflow gracefully', async () => {
      // Fill queue to capacity
      for (let i = 0; i < 100; i++) {
        await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: `Capacity Test ${i}` });
      }

      expect(operationQueue.size()).toEqual(100);

      // Add more operations (should trigger overflow handling)
      const { duration } = await measureExecutionTime(async () => {
        for (let i = 0; i < 10; i++) {
          await operationQueue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: `Overflow Test ${i}` });
        }
      });

      console.log(`\n=== Queue Overflow Performance ===`);
      console.log(`Overflow handling time: ${duration.toFixed(2)}ms (10 operations)`);
      console.log(`Time per overflow operation: ${(duration / 10).toFixed(3)}ms`);
      console.log(`Final queue size: ${operationQueue.size()}`);

      // Queue should still be at capacity and overflow should be fast
      expect(operationQueue.size()).toEqual(100);
      expect(duration / 10).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
    });
  });
});