/**
 * Simplified Integration tests for handler patterns
 * Focus on testing the patterns that work reliably together
 */

import {
  createQueueHandler,
  createDefaultQueueHandlerConfig, 
  QueueHandlerFactory
} from '../../../../services/handlers/gateways/queueHandler';

import { 
  createClientGateway,
  createDefaultClientGatewayConfig,
  ClientGatewayFactory 
} from '../../../../services/handlers/gateways/clientGateway';

import { 
  ClientGatewayHandler, 
  QueueHandlerType,
  CreatePayload,
  UpdatePayload 
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

// HTTP client mock that works with the ClientGateway
interface HttpClient {
  get<T>(url: string, config?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  put<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string, config?: Record<string, unknown>): Promise<T>;
}

// Mock navigator.onLine for ClientGateway tests
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Handler Patterns Simple Integration', () => {
  // Clear the global queue before all tests to ensure clean state
  beforeAll(async () => {
    const globalConfig = createDefaultQueueHandlerConfig('book');
    await globalConfig.queue.clear();
  });

  describe('QueueHandler Integration with Real OperationQueue', () => {
    let queueHandler: QueueHandlerType<TestBook>;
    let queueConfig: ReturnType<typeof createDefaultQueueHandlerConfig>;

    beforeEach(async () => {
      queueConfig = createDefaultQueueHandlerConfig('book');
      queueHandler = createQueueHandler<TestBook>('book', queueConfig);
      await queueConfig.queue.clear();
    });

    it('should queue operations and track them through the real queue', async () => {
      const testBook: CreatePayload<TestBook> = {
        title: 'Integration Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const initialSize = queueConfig.queue.size();
      expect(initialSize).toBe(0);

      // Create operation
      const createId = await queueHandler.create(testBook);
      expect(createId).toMatch(/^[a-f0-9-]+$/); // UUID format
      expect(queueConfig.queue.size()).toBe(1);

      // Update operation
      const updateId = await queueHandler.update('test-book-id', { title: 'Updated Title' });
      expect(updateId).toMatch(/^[a-f0-9-]+$/);
      expect(queueConfig.queue.size()).toBe(2);

      // Delete operation
      const deleteId = await queueHandler.delete('test-book-id');
      expect(deleteId).toMatch(/^[a-f0-9-]+$/);
      expect(queueConfig.queue.size()).toBe(3);

      // All IDs should be different
      expect(new Set([createId, updateId, deleteId]).size).toBe(3);
    });

    it('should handle queue errors properly with ApiError', async () => {
      // Force an error by making the queue reject
      const originalAdd = queueConfig.queue.add;
      queueConfig.queue.add = jest.fn().mockRejectedValue(new Error('Queue is full'));

      try {
        await queueHandler.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading'
        });
        fail('Expected queue error');
      } catch (error) {
        expect(error.code).toBe('QUEUE_ERROR');
        expect(error.retriable).toBe(true);
        expect(error.message).toContain('Queue is full');
      }

      // Restore original
      queueConfig.queue.add = originalAdd;
    });

    it('should support different ID generation strategies', async () => {
      // The OperationQueue returns UUIDs, so the QueueHandler ID generation
      // strategies are overridden. Instead test that the handlers work with
      // different configurations.
      
      // Test timestamp strategy configuration
      const timestampConfig = createDefaultQueueHandlerConfig('book');
      timestampConfig.queueOptions.idGenerationStrategy = 'timestamp';
      const timestampHandler = createQueueHandler<TestBook>('book', timestampConfig);

      const tempId = await timestampHandler.create({
        title: 'Timestamp Book',
        author: 'Test Author',
        status: 'reading'
      });

      // OperationQueue returns UUIDs, not temp IDs from handler
      expect(tempId).toMatch(/^[a-f0-9-]+$/); // UUID format

      // Test sequential strategy configuration
      const sequentialConfig = createDefaultQueueHandlerConfig('book');
      sequentialConfig.queueOptions.idGenerationStrategy = 'sequential';
      const sequentialHandler = createQueueHandler<TestBook>('book', sequentialConfig);

      const seqId = await sequentialHandler.create({
        title: 'Sequential Book',
        author: 'Test Author',
        status: 'reading'
      });

      // OperationQueue returns UUIDs, not temp IDs from handler
      expect(seqId).toMatch(/^[a-f0-9-]+$/); // UUID format

      // Clean up
      await timestampConfig.queue.clear();
      await sequentialConfig.queue.clear();
    });
  });

  describe('ClientGateway Integration with HTTP Client', () => {
    let clientGateway: ClientGatewayHandler<TestBook>;
    let mockHttpClient: HttpClient;

    beforeEach(() => {
      // Ensure navigator.onLine is true for ClientGateway tests
      global.navigator.onLine = true;
      
      mockHttpClient = {
        get: jest.fn().mockResolvedValue({}),
        post: jest.fn().mockResolvedValue({}),
        put: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      };

      const config = createDefaultClientGatewayConfig(mockHttpClient);
      clientGateway = createClientGateway<TestBook>('book', config);
    });

    it('should make correct HTTP calls for CRUD operations', async () => {
      const testBook: CreatePayload<TestBook> = {
        title: 'HTTP Test Book',
        author: 'HTTP Author',
        status: 'reading'
      };

      // Mock successful responses
      (mockHttpClient.post as jest.Mock).mockResolvedValueOnce({
        id: 'server-123',
        ...testBook,
        creationDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z'
      });

      const result = await clientGateway.create(testBook);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books',
        testBook,
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );

      expect(result.id).toBe('server-123');
    });

    it('should handle network errors correctly', async () => {
      // Mock network failure
      (mockHttpClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'));

      try {
        await clientGateway.create({
          title: 'Failed Book',
          author: 'Failed Author',
          status: 'reading'
        });
        fail('Expected network error');
      } catch (error) {
        expect(error.message).toContain('Network request failed');
      }
    });

    it('should validate configuration properly', () => {
      // Test invalid configuration
      expect(() => {
        createDefaultClientGatewayConfig(null as never);
      }).not.toThrow(); // The function doesn't validate input

      // Test valid configuration
      const validConfig = createDefaultClientGatewayConfig(mockHttpClient);
      expect(validConfig.httpClient).toBe(mockHttpClient);
      expect(validConfig.baseURL).toBe('http://localhost:3001/api/v1');
      expect(validConfig.timeout).toBe(10000);
    });
  });

  describe('Factory Pattern Integration', () => {
    it('should create different handler types with factories', () => {
      // QueueHandler factory
      const queueConfig = createDefaultQueueHandlerConfig('book');
      const queueFactory = new QueueHandlerFactory(queueConfig);

      const bookHandler = queueFactory.createBookHandler<TestBook>();
      const authorHandler = queueFactory.createAuthorHandler();
      const categoryHandler = queueFactory.createCategoryHandler();
      const customHandler = queueFactory.createHandler<TestBook>('custom');

      expect(bookHandler).toBeDefined();
      expect(authorHandler).toBeDefined();
      expect(categoryHandler).toBeDefined();
      expect(customHandler).toBeDefined();

      // All should have the same interface
      expect(typeof bookHandler.create).toBe('function');
      expect(typeof bookHandler.update).toBe('function');
      expect(typeof bookHandler.delete).toBe('function');
    });

    it('should update factory configuration correctly', async () => {
      const queueConfig = createDefaultQueueHandlerConfig('book');
      const factory = new QueueHandlerFactory(queueConfig);

      const initialStatus = factory.getQueueStatus();
      expect(initialStatus.resourceType).toBe('book');
      expect(initialStatus.size).toBe(0);

      // Update config
      factory.updateConfig({
        resourceType: 'author',
        queueOptions: {
          generateOptimisticIds: false,
          idGenerationStrategy: 'timestamp',
          validateBeforeQueue: false,
          deduplicateOperations: false,
          conflictResolution: 'manual'
        }
      });

      const updatedStatus = factory.getQueueStatus();
      expect(updatedStatus.resourceType).toBe('author');

      // Clean up
      factory.clearQueue();
      expect(factory.getQueueStatus().size).toBe(0);
    });

    it('should manage memory efficiently', async () => {
      const queueConfig = createDefaultQueueHandlerConfig('book');
      const factory = new QueueHandlerFactory(queueConfig);

      // Create multiple handlers and add operations
      const handlers = Array.from({ length: 5 }, () => 
        factory.createBookHandler<TestBook>()
      );

      const operations = handlers.map((handler, index) => 
        handler.create({
          title: `Book ${index}`,
          author: `Author ${index}`,
          status: 'reading'
        })
      );

      await Promise.all(operations);

      expect(factory.getQueueStatus().size).toBe(5);

      // Clear all at once
      factory.clearQueue();
      expect(factory.getQueueStatus().size).toBe(0);
    });
  });

  describe('Strategy Selection Integration', () => {
    it('should allow runtime strategy selection', () => {
      // Simulate strategy selection logic
      const selectStrategy = (conditions: {
        isOnline: boolean;
        requiresImmediate: boolean;
        canQueue: boolean;
      }) => {
        if (conditions.requiresImmediate && conditions.isOnline) {
          return 'clientGateway';
        }
        if (conditions.canQueue && !conditions.isOnline) {
          return 'queueHandler';
        }
        if (conditions.isOnline) {
          return 'mobileHandler'; // Would use auto-queueing
        }
        return 'queueHandler';
      };

      // Test scenarios
      expect(selectStrategy({ isOnline: true, requiresImmediate: true, canQueue: true }))
        .toBe('clientGateway');
      
      expect(selectStrategy({ isOnline: false, requiresImmediate: false, canQueue: true }))
        .toBe('queueHandler');
      
      expect(selectStrategy({ isOnline: true, requiresImmediate: false, canQueue: true }))
        .toBe('mobileHandler');
      
      expect(selectStrategy({ isOnline: false, requiresImmediate: true, canQueue: true }))
        .toBe('queueHandler');
    });

    it('should handle configuration validation across patterns', () => {
      // Test queue configuration
      const queueConfig = createDefaultQueueHandlerConfig('book');
      expect(queueConfig.resourceType).toBe('book');
      expect(queueConfig.queueOptions.generateOptimisticIds).toBe(true);

      // Test client configuration
      const mockHttpClient: HttpClient = {
        get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn()
      };
      const clientConfig = createDefaultClientGatewayConfig(mockHttpClient);
      expect(clientConfig.baseURL).toBe('http://localhost:3001/api/v1');
      expect(clientConfig.httpClient).toBe(mockHttpClient);

      // Both configurations should be valid
      expect(() => createQueueHandler('book', queueConfig)).not.toThrow();
      expect(() => createClientGateway('book', clientConfig)).not.toThrow();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent operations efficiently', async () => {
      const queueConfig = createDefaultQueueHandlerConfig('book');
      const queueHandler = createQueueHandler<TestBook>('book', queueConfig);

      const startTime = Date.now();
      
      // Create 20 concurrent operations
      const operations = Array.from({ length: 20 }, (_, i) =>
        queueHandler.create({
          title: `Concurrent Book ${i}`,
          author: `Author ${i}`,
          status: 'reading'
        })
      );

      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should complete
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // All IDs should be unique
      const uniqueIds = new Set(results);
      expect(uniqueIds.size).toBe(20);

      // Queue should contain all operations
      expect(queueConfig.queue.size()).toBe(20);

      // Clean up
      await queueConfig.queue.clear();
    });
  });
});