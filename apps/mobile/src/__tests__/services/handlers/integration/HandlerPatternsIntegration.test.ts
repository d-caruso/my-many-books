/**
 * Integration tests for all handler patterns
 * Tests ClientGateway, MobileHandler, and QueueHandler working together
 */

import { 
  createClientGateway,
  createDefaultClientGatewayConfig,
  ClientGatewayFactory 
} from '../../../../services/handlers/gateways/clientGateway';

import {
  createMobileHandler, 
  createDefaultMobileHandlerConfig,
  MobileHandlerFactory
} from '../../../../services/handlers/gateways/mobileHandler';

import {
  createQueueHandler,
  createDefaultQueueHandlerConfig, 
  QueueHandlerFactory
} from '../../../../services/handlers/gateways/queueHandler';

import { 
  ClientGatewayHandler, 
  MobileHandlerType, 
  QueueHandlerType,
  CreatePayload,
  UpdatePayload 
} from '../../../../services/handlers/types/HandlerTypes';

// Mock book type for testing
interface TestBook {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed';
  creationDate: string;
  updateDate: string;
}

// Proper HTTP client mock that matches the interface
interface HttpClient {
  get<T>(url: string, config?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  put<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string, config?: Record<string, unknown>): Promise<T>;
}

const createMockHttpClient = (): HttpClient => {
  const mockClient = {
    get: jest.fn().mockImplementation((url: string, config?: Record<string, unknown>) => Promise.resolve({})),
    post: jest.fn().mockImplementation((url: string, data?: unknown, config?: Record<string, unknown>) => Promise.resolve({})),
    put: jest.fn().mockImplementation((url: string, data?: unknown, config?: Record<string, unknown>) => Promise.resolve({})),
    delete: jest.fn().mockImplementation((url: string, config?: Record<string, unknown>) => Promise.resolve({}))
  };
  
  return mockClient as HttpClient;
};

// Mock network provider interface
interface NetworkStateProvider {
  isOnline(): boolean;
  onNetworkChange(callback: (isOnline: boolean) => void): () => void;
  getCurrentState(): {
    isConnected: boolean;
    isInternetReachable?: boolean;
    connectionType?: string;
  };
}

// Mock network state utility
const mockNetworkState = {
  isOnline: true,
  setOnline: (online: boolean) => { mockNetworkState.isOnline = online; },
  reset: () => { mockNetworkState.isOnline = true; }
};

// Mock network provider for MobileHandler
const createMockNetworkProvider = (): NetworkStateProvider => ({
  isOnline: () => mockNetworkState.isOnline,
  onNetworkChange: jest.fn(() => jest.fn()), // Return unsubscribe function
  getCurrentState: () => ({ 
    isConnected: mockNetworkState.isOnline,
    isInternetReachable: mockNetworkState.isOnline,
    connectionType: 'wifi'
  })
});

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Handler Patterns Integration', () => {
  let clientGateway: ClientGatewayHandler<TestBook>;
  let mobileHandler: MobileHandlerType<TestBook>;
  let queueHandler: QueueHandlerType<TestBook>;
  let mockHttpClient: HttpClient;
  let mockNetworkProvider: NetworkStateProvider;

  beforeEach(async () => {
    // Reset network state
    mockNetworkState.reset();
    global.navigator.onLine = true;

    // Create mocks
    mockHttpClient = createMockHttpClient();
    mockNetworkProvider = createMockNetworkProvider();

    // Setup ClientGateway
    const clientConfig = createDefaultClientGatewayConfig(mockHttpClient);
    clientGateway = createClientGateway<TestBook>('book', clientConfig);

    // Setup MobileHandler with network provider and queue
    const mobileConfig = createDefaultMobileHandlerConfig('book', mockHttpClient);
    mobileConfig.networkProvider = mockNetworkProvider;
    // Also need to add queue to MobileHandler config
    const queueConfig = createDefaultQueueHandlerConfig('book');
    mobileConfig.queue = queueConfig.queue;
    mobileHandler = createMobileHandler<TestBook>('book', mobileConfig);

    // Setup QueueHandler
    queueHandler = createQueueHandler<TestBook>('book', queueConfig);
    
    // Clear queue before each test
    await queueConfig.queue.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-Handler Strategy Switching', () => {
    const testBook: CreatePayload<TestBook> = {
      title: 'Test Book',
      author: 'Test Author',
      status: 'reading'
    };

    it('should use ClientGateway for immediate HTTP calls when online', async () => {
      mockHttpClient.post.mockResolvedValue({ 
        id: 'server-123', 
        ...testBook,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      });

      const result = await clientGateway.create(testBook);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/books',
        testBook,
        expect.any(Object)
      );
      expect(result.id).toBe('server-123');
      expect(result.title).toBe(testBook.title);
    });

    it('should fail fast with ClientGateway when offline', async () => {
      global.navigator.onLine = false;

      try {
        await clientGateway.create(testBook);
        fail('Expected ClientGateway to fail when offline');
      } catch (error) {
        expect(error.message).toContain('No internet connection available');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      }
    });

    it('should queue operations with QueueHandler regardless of network', async () => {
      // Test online
      global.navigator.onLine = true;
      const onlineId = await queueHandler.create(testBook);
      expect(onlineId).toMatch(/^[a-f0-9-]+$/); // UUID format

      // Test offline  
      global.navigator.onLine = false;
      const offlineId = await queueHandler.create(testBook);
      expect(offlineId).toMatch(/^[a-f0-9-]+$/); // UUID format

      // Both should be queued (no HTTP calls)
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should handle MobileHandler auto-queueing gracefully', async () => {
      // When HTTP fails, should queue automatically
      mockHttpClient.post.mockRejectedValue(new Error('Network request failed'));

      const result = await mobileHandler.create(testBook);

      // Should attempt HTTP first, then queue on failure
      expect(mockHttpClient.post).toHaveBeenCalled();
      expect(result.id).toMatch(/^temp-/); // Optimistic temp ID
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle validation errors consistently across handlers', async () => {
      const invalidBook = null as never; // Invalid payload

      // ClientGateway should let HTTP client handle validation
      mockHttpClient.post.mockRejectedValue(new Error('Validation failed'));
      
      try {
        await clientGateway.create(invalidBook);
        fail('Expected validation error');
      } catch (error) {
        expect(error.message).toContain('Validation failed');
      }

      // QueueHandler should validate before queuing
      try {
        await queueHandler.create(invalidBook);
        fail('Expected validation error');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle network timeouts consistently', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';

      // ClientGateway should fail immediately
      mockHttpClient.post.mockRejectedValue(timeoutError);
      
      try {
        await clientGateway.create({ title: 'Test', author: 'Test', status: 'reading' });
        fail('Expected timeout error');
      } catch (error) {
        expect(error.name).toBe('AbortError');
      }

      // MobileHandler should queue on timeout
      const result = await mobileHandler.create({ title: 'Test', author: 'Test', status: 'reading' });
      expect(result.id).toMatch(/^temp-/);
    });
  });

  describe('Factory Pattern Integration', () => {
    it('should create handlers using factories', () => {
      // ClientGateway factory
      const clientFactory = new ClientGatewayFactory(
        createDefaultClientGatewayConfig(mockHttpClient)
      );
      const factoryClientHandler = clientFactory.createBookGateway<TestBook>();
      expect(factoryClientHandler).toBeDefined();

      // MobileHandler factory
      const mobileFactory = new MobileHandlerFactory(
        createDefaultMobileHandlerConfig('book', mockHttpClient)
      );
      const factoryMobileHandler = mobileFactory.createBookHandler<TestBook>();
      expect(factoryMobileHandler).toBeDefined();

      // QueueHandler factory
      const queueFactory = new QueueHandlerFactory(
        createDefaultQueueHandlerConfig('book')
      );
      const factoryQueueHandler = queueFactory.createBookHandler<TestBook>();
      expect(factoryQueueHandler).toBeDefined();
    });

    it('should allow factory configuration updates', () => {
      const queueFactory = new QueueHandlerFactory(
        createDefaultQueueHandlerConfig('book')
      );

      const initialStatus = queueFactory.getQueueStatus();
      expect(initialStatus.resourceType).toBe('book');

      queueFactory.updateConfig({
        resourceType: 'author',
        queueOptions: {
          generateOptimisticIds: false,
          idGenerationStrategy: 'timestamp',
          validateBeforeQueue: false,
          deduplicateOperations: false,
          conflictResolution: 'manual'
        }
      });

      const updatedStatus = queueFactory.getQueueStatus();
      expect(updatedStatus.resourceType).toBe('author');
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('should handle complete CRUD workflow with different strategies', async () => {
      const createPayload: CreatePayload<TestBook> = {
        title: 'Workflow Book',
        author: 'Workflow Author',
        status: 'reading'
      };

      // 1. Create with QueueHandler (queue-only)
      const queueCreateId = await queueHandler.create(createPayload);
      expect(queueCreateId).toMatch(/^[a-f0-9-]+$/);

      // 2. Update with MobileHandler (try HTTP, queue on failure)
      mockHttpClient.put.mockRejectedValue(new Error('Server error'));
      const updatePayload: UpdatePayload<TestBook> = { title: 'Updated Title' };
      
      const mobileUpdateResult = await mobileHandler.update('book-123', updatePayload);
      expect(mobileUpdateResult.title).toBe('Updated Title');

      // 3. Delete with ClientGateway (HTTP only, online)
      mockHttpClient.delete.mockResolvedValue({});
      
      await clientGateway.delete('book-123');
      expect(mockHttpClient.delete).toHaveBeenCalledWith('http://localhost:3001/api/v1/books/book-123', expect.any(Object));
    });

    it('should handle offline-to-online transition scenarios', async () => {
      const book: CreatePayload<TestBook> = {
        title: 'Transition Book', 
        author: 'Transition Author',
        status: 'reading'
      };

      // Start offline - use QueueHandler
      global.navigator.onLine = false;
      const offlineId = await queueHandler.create(book);
      expect(offlineId).toMatch(/^[a-f0-9-]+$/);

      // Come back online - use ClientGateway
      global.navigator.onLine = true;
      mockHttpClient.post.mockResolvedValue({
        id: 'server-456',
        ...book,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      });

      const onlineResult = await clientGateway.create(book);
      expect(onlineResult.id).toBe('server-456');
      expect(mockHttpClient.post).toHaveBeenCalled();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent operations efficiently', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        title: `Concurrent Book ${i}`,
        author: `Author ${i}`,
        status: 'reading' as const
      }));

      // Test QueueHandler concurrent operations
      const startTime = Date.now();
      const promises = operations.map(book => queueHandler.create(book));
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      results.forEach(id => expect(id).toMatch(/^[a-f0-9-]+$/));
    });

    it('should manage memory efficiently with factory cleanup', async () => {
      const factory = new QueueHandlerFactory(
        createDefaultQueueHandlerConfig('book')
      );

      // Create multiple handlers
      const handlers = Array.from({ length: 5 }, () => 
        factory.createBookHandler<TestBook>()
      );

      // Use handlers
      await Promise.all(handlers.map(handler => 
        handler.create({ title: 'Memory Test', author: 'Test', status: 'reading' })
      ));

      // Clear queue to free memory
      factory.clearQueue();
      expect(factory.getQueueStatus().size).toBe(0);
    });
  });

  describe('Configuration and Strategy Selection', () => {
    it('should allow runtime strategy selection based on conditions', async () => {
      const book: CreatePayload<TestBook> = {
        title: 'Strategy Test',
        author: 'Strategy Author', 
        status: 'reading'
      };

      // Simulate strategy selection logic
      const selectStrategy = (isOnline: boolean, requiresImmediate: boolean) => {
        if (requiresImmediate && isOnline) return 'clientGateway';
        if (isOnline) return 'mobileHandler';
        return 'queueHandler';
      };

      // Test different scenarios
      const scenarios = [
        { isOnline: true, requiresImmediate: true, expected: 'clientGateway' },
        { isOnline: true, requiresImmediate: false, expected: 'mobileHandler' },
        { isOnline: false, requiresImmediate: true, expected: 'queueHandler' },
        { isOnline: false, requiresImmediate: false, expected: 'queueHandler' }
      ];

      for (const scenario of scenarios) {
        const strategy = selectStrategy(scenario.isOnline, scenario.requiresImmediate);
        expect(strategy).toBe(scenario.expected);
      }
    });

    it('should validate handler configurations', () => {
      // Valid configurations should work
      expect(() => createDefaultClientGatewayConfig(mockHttpClient)).not.toThrow();
      expect(() => createDefaultMobileHandlerConfig('book', mockHttpClient)).not.toThrow();
      expect(() => createDefaultQueueHandlerConfig('book')).not.toThrow();

      // Test configuration with different options
      const customQueueConfig = createDefaultQueueHandlerConfig('book');
      customQueueConfig.queueOptions.idGenerationStrategy = 'timestamp';
      customQueueConfig.queueOptions.validateBeforeQueue = false;
      
      expect(() => createQueueHandler<TestBook>('book', customQueueConfig)).not.toThrow();
    });
  });
});