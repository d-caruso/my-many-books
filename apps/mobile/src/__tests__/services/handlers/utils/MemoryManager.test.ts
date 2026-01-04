/**
 * Tests for Memory Management Utilities
 */

import {
  ObjectPool,
  TimeBasedCache,
  HandlerResourceManager,
  MemoryMonitor,
  MemoryUtils
} from '../../../../services/handlers/utils/MemoryManager';

describe('Memory Management Utilities', () => {
  describe('ObjectPool', () => {
    interface TestObject {
      id: number;
      data: string;
    }

    it('should create and reuse objects efficiently', () => {
      let createCount = 0;
      const createFn = (): TestObject => {
        createCount++;
        return { id: createCount, data: '' };
      };

      const resetFn = (obj: TestObject) => {
        obj.data = '';
      };

      const pool = new ObjectPool(createFn, resetFn, 10);

      // First acquisition should create a new object
      const obj1 = pool.acquire();
      expect(obj1.id).toBe(1);
      expect(createCount).toBe(1);

      // Modify and release
      obj1.data = 'test';
      pool.release(obj1);

      // Second acquisition should reuse the released object
      const obj2 = pool.acquire();
      expect(obj2).toBe(obj1); // Same object reference
      expect(obj2.data).toBe(''); // Reset by resetFn
      expect(createCount).toBe(1); // No new creation

      // Get stats
      const stats = pool.getStats();
      expect(stats.maxSize).toBe(10);
    });

    it('should limit pool size', () => {
      const pool = new ObjectPool(() => ({}), undefined, 2);

      const objects = [pool.acquire(), pool.acquire(), pool.acquire()];
      
      // Release all objects
      objects.forEach(obj => pool.release(obj));

      // Pool should only keep 2 objects
      const stats = pool.getStats();
      expect(stats.poolSize).toBe(2);
      expect(stats.maxSize).toBe(2);
    });

    it('should clear the pool', () => {
      const pool = new ObjectPool(() => ({}));
      
      pool.acquire();
      pool.release({});
      
      expect(pool.getStats().poolSize).toBeGreaterThan(0);
      
      pool.clear();
      expect(pool.getStats().poolSize).toBe(0);
    });
  });

  describe('TimeBasedCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cache and retrieve values', () => {
      const cache = new TimeBasedCache<string, string>(60000); // 1 minute TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should expire values after TTL', () => {
      const cache = new TimeBasedCache<string, string>(1000); // 1 second TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      // Advance time by 1.5 seconds
      jest.advanceTimersByTime(1500);

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.has('key1')).toBe(false);
    });

    it('should clean up expired entries', () => {
      const cache = new TimeBasedCache<string, string>(1000); // 1 second TTL

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Advance time to expire entries
      jest.advanceTimersByTime(1500);

      const cleanedCount = cache.cleanup();
      expect(cleanedCount).toBe(2);

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should handle cache operations', () => {
      const cache = new TimeBasedCache<string, string>(60000);

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');

      cache.clear();
      expect(cache.get('key2')).toBeUndefined();

      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.ttl).toBe(60000);
    });

    it('should destroy properly', () => {
      const cache = new TimeBasedCache<string, string>(60000, 100);
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      cache.destroy();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('HandlerResourceManager', () => {
    let manager: HandlerResourceManager;

    beforeEach(() => {
      manager = HandlerResourceManager.getInstance();
      manager.clearAll(); // Clean state for each test
    });

    afterEach(() => {
      manager.clearAll();
    });

    it('should be a singleton', () => {
      const manager1 = HandlerResourceManager.getInstance();
      const manager2 = HandlerResourceManager.getInstance();
      expect(manager1).toBe(manager2);
    });

    it('should manage caches for different resource types', () => {
      const bookCache = manager.getCache<string, string>('book');
      const authorCache = manager.getCache<string, string>('author');

      bookCache.set('book1', 'Book 1');
      authorCache.set('author1', 'Author 1');

      expect(bookCache.get('book1')).toBe('Book 1');
      expect(authorCache.get('author1')).toBe('Author 1');

      // Should be different cache instances
      expect(bookCache).not.toBe(authorCache);

      // Should return same cache for same resource type
      const bookCache2 = manager.getCache<string, string>('book');
      expect(bookCache).toBe(bookCache2);
    });

    it('should manage pools for different resource types', () => {
      const bookPool = manager.getPool('book', () => ({ type: 'book' }));
      const authorPool = manager.getPool('author', () => ({ type: 'author' }));

      const book = bookPool.acquire();
      const author = authorPool.acquire();

      expect(book.type).toBe('book');
      expect(author.type).toBe('author');

      // Should be different pool instances
      expect(bookPool).not.toBe(authorPool);
    });

    it('should clear resources by type', () => {
      const bookCache = manager.getCache<string, string>('book');
      const bookPool = manager.getPool('book', () => ({}));

      bookCache.set('key', 'value');
      bookPool.acquire();

      manager.clearResourceType('book');

      // Should get new instances after clearing
      const newBookCache = manager.getCache<string, string>('book');
      const newBookPool = manager.getPool('book', () => ({}));

      expect(newBookCache).not.toBe(bookCache);
      expect(newBookPool).not.toBe(bookPool);
    });

    it('should provide memory statistics', () => {
      const bookCache = manager.getCache<string, string>('book', 30000);
      const bookPool = manager.getPool('book', () => ({}), undefined, 25);

      bookCache.set('key1', 'value1');
      bookCache.set('key2', 'value2');
      
      // Use the pool to ensure it's properly tracked
      expect(bookPool).toBeDefined();
      expect(typeof bookPool.acquire).toBe('function');

      const stats = manager.getMemoryStats();

      expect(stats.totalCaches).toBe(1);
      expect(stats.totalPools).toBe(1);
      expect(stats.cacheStats[0].name).toBe('book_cache');
      expect(stats.cacheStats[0].size).toBe(2);
      expect(stats.cacheStats[0].ttl).toBe(30000);
      expect(stats.poolStats[0].name).toBe('book_pool');
      expect(stats.poolStats[0].maxSize).toBe(25);
    });
  });

  describe('MemoryMonitor', () => {
    beforeEach(() => {
      MemoryMonitor.clear();
    });

    it('should track memory measurements', () => {
      MemoryMonitor.measure('start');
      MemoryMonitor.measure('middle');
      MemoryMonitor.measure('end');

      const measurements = MemoryMonitor.getMeasurements();
      expect(measurements).toHaveLength(3);
      expect(measurements[0].label).toBe('start');
      expect(measurements[1].label).toBe('middle');
      expect(measurements[2].label).toBe('end');
    });

    it('should calculate memory differences', () => {
      MemoryMonitor.measure('before');
      
      // Simulate some memory allocation
      const largeArray = new Array(1000).fill('test');
      
      MemoryMonitor.measure('after');

      const diff = MemoryMonitor.getDifference('before', 'after');
      expect(typeof diff).toBe('number');
      
      // Clean up
      largeArray.length = 0;
    });

    it('should limit measurement history', () => {
      // Add more than 100 measurements
      for (let i = 0; i < 150; i++) {
        MemoryMonitor.measure(`measurement_${i}`);
      }

      const measurements = MemoryMonitor.getMeasurements();
      expect(measurements).toHaveLength(100);
      expect(measurements[0].label).toBe('measurement_50'); // First 50 should be trimmed
      expect(measurements[99].label).toBe('measurement_149');
    });

    it('should clear measurements', () => {
      MemoryMonitor.measure('test');
      expect(MemoryMonitor.getMeasurements()).toHaveLength(1);

      MemoryMonitor.clear();
      expect(MemoryMonitor.getMeasurements()).toHaveLength(0);
    });
  });

  describe('MemoryUtils', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = MemoryUtils.debounce(mockFn, 100);

      // Call multiple times rapidly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance time
      jest.advanceTimersByTime(100);

      // Should only be called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    it('should throttle function calls', () => {
      const mockFn = jest.fn();
      const throttledFn = MemoryUtils.throttle(mockFn, 100);

      // Call multiple times rapidly
      throttledFn('arg1');
      throttledFn('arg2');
      throttledFn('arg3');

      // Should only be called once immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1');

      // Advance time and call again
      jest.advanceTimersByTime(100);
      throttledFn('arg4');

      // Should be called again after throttle period
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
    });

    it('should shallow clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = MemoryUtils.shallowClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).toBe(original.b); // Shallow clone - nested objects are same reference

      // Test array cloning
      const originalArray = [1, 2, 3];
      const clonedArray = MemoryUtils.shallowClone(originalArray);

      expect(clonedArray).toEqual(originalArray);
      expect(clonedArray).not.toBe(originalArray);

      // Test primitive values
      expect(MemoryUtils.shallowClone('string')).toBe('string');
      expect(MemoryUtils.shallowClone(42)).toBe(42);
      expect(MemoryUtils.shallowClone(null)).toBe(null);
    });

    it('should handle force GC safely', () => {
      // Should not throw even if global.gc is not available
      expect(() => MemoryUtils.forceGC()).not.toThrow();
    });
  });
});