/**
 * Memory Management Utilities for Handler Patterns
 * Provides object pooling, cache management, and resource cleanup
 */

/**
 * Simple object pool for frequently created objects
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn?: (obj: T) => void, maxSize: number = 50) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get an object from the pool or create a new one
   */
  acquire(): T {
    const obj = this.pool.pop();
    if (obj) {
      return obj;
    }
    return this.createFn();
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0;
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; maxSize: number } {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize
    };
  }
}

/**
 * Time-based cache with automatic cleanup
 */
export class TimeBasedCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private ttl: number;
  private cleanupInterval: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(ttl: number = 300000, cleanupInterval: number = 60000) {
    this.ttl = ttl;
    this.cleanupInterval = cleanupInterval;
    this.startCleanup();
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if cache has a key
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; ttl: number } {
    return {
      size: this.cache.size,
      ttl: this.ttl
    };
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

/**
 * Resource manager for handler instances
 */
export class HandlerResourceManager {
  private static instance: HandlerResourceManager;
  private caches = new Map<string, TimeBasedCache<string, unknown>>();
  private pools = new Map<string, ObjectPool<unknown>>();

  private constructor() {}

  static getInstance(): HandlerResourceManager {
    if (!HandlerResourceManager.instance) {
      HandlerResourceManager.instance = new HandlerResourceManager();
    }
    return HandlerResourceManager.instance;
  }

  /**
   * Get or create a cache for a resource type
   */
  getCache<K, V>(resourceType: string, ttl: number = 300000): TimeBasedCache<K, V> {
    const cacheKey = `${resourceType}_cache`;
    let cache = this.caches.get(cacheKey) as TimeBasedCache<K, V>;
    
    if (!cache) {
      cache = new TimeBasedCache<K, V>(ttl);
      this.caches.set(cacheKey, cache as TimeBasedCache<string, unknown>);
    }
    
    return cache;
  }

  /**
   * Get or create an object pool for a resource type
   */
  getPool<T>(
    resourceType: string, 
    createFn: () => T, 
    resetFn?: (obj: T) => void,
    maxSize: number = 50
  ): ObjectPool<T> {
    const poolKey = `${resourceType}_pool`;
    let pool = this.pools.get(poolKey) as ObjectPool<T>;
    
    if (!pool) {
      pool = new ObjectPool(createFn, resetFn, maxSize);
      this.pools.set(poolKey, pool as ObjectPool<unknown>);
    }
    
    return pool;
  }

  /**
   * Clear all resources for a resource type
   */
  clearResourceType(resourceType: string): void {
    const cacheKey = `${resourceType}_cache`;
    const poolKey = `${resourceType}_pool`;

    const cache = this.caches.get(cacheKey);
    if (cache) {
      cache.destroy();
      this.caches.delete(cacheKey);
    }

    const pool = this.pools.get(poolKey);
    if (pool) {
      pool.clear();
      this.pools.delete(poolKey);
    }
  }

  /**
   * Clear all resources
   */
  clearAll(): void {
    // Destroy all caches
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();

    // Clear all pools
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): {
    totalCaches: number;
    totalPools: number;
    cacheStats: Array<{ name: string; size: number; ttl: number }>;
    poolStats: Array<{ name: string; poolSize: number; maxSize: number }>;
  } {
    const cacheStats = Array.from(this.caches.entries()).map(([name, cache]) => ({
      name,
      ...cache.getStats()
    }));

    const poolStats = Array.from(this.pools.entries()).map(([name, pool]) => ({
      name,
      ...pool.getStats()
    }));

    return {
      totalCaches: this.caches.size,
      totalPools: this.pools.size,
      cacheStats,
      poolStats
    };
  }
}

/**
 * Memory monitoring utilities
 */
export class MemoryMonitor {
  private static measurements: Array<{ timestamp: number; heapUsed: number; label: string }> = [];

  /**
   * Take a memory measurement
   */
  static measure(label: string): void {
    const memUsage = process.memoryUsage();
    this.measurements.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      label
    });

    // Keep only last 100 measurements
    if (this.measurements.length > 100) {
      this.measurements = this.measurements.slice(-100);
    }
  }

  /**
   * Get memory usage difference between two measurements
   */
  static getDifference(startLabel: string, endLabel: string): number {
    const start = this.measurements.find(m => m.label === startLabel);
    const end = this.measurements.find(m => m.label === endLabel);

    if (!start || !end) {
      return 0;
    }

    return end.heapUsed - start.heapUsed;
  }

  /**
   * Clear all measurements
   */
  static clear(): void {
    this.measurements.length = 0;
  }

  /**
   * Get all measurements
   */
  static getMeasurements(): Array<{ timestamp: number; heapUsed: number; label: string }> {
    return [...this.measurements];
  }
}

/**
 * Utility functions for memory optimization
 */
export const MemoryUtils = {
  /**
   * Create a debounced function to reduce memory allocations
   */
  debounce<T extends Function>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout | undefined;
    
    return ((...args: unknown[]) => {
      const later = () => {
        timeout = undefined;
        func(...args);
      };
      
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    }) as unknown as T;
  },

  /**
   * Create a throttled function to limit execution frequency
   */
  throttle<T extends Function>(func: T, limit: number): T {
    let inThrottle: boolean;
    
    return ((...args: unknown[]) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as unknown as T;
  },

  /**
   * Clone an object without creating unnecessary references
   */
  shallowClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Array) {
      return [...obj] as unknown as T;
    }
    
    return { ...obj as object } as T;
  },

  /**
   * Force garbage collection if available (for testing)
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }
};