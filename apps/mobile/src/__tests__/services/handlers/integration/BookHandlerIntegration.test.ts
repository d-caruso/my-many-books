/**
 * Tests for Book Handler Integration
 */

import { BookHandlerIntegration, getBookHandlerIntegration, createIntegratedBookHandlers } from '../../../../services/handlers/integration/BookHandlerIntegration';
import { OperationQueue } from '../../../../services/OperationQueue';
import { IDMappingService } from '../../../../services/sync/IDMappingService';

// Mock dependencies
jest.mock('../../../../services/OperationQueue');
jest.mock('../../../../services/sync/IDMappingService');
jest.mock('../../../../services/handlers/BookHandlers');
jest.mock('../../../../services/handlers/gateways/clientGateway');
jest.mock('../../../../services/handlers/gateways/mobileHandler'); 
jest.mock('../../../../services/handlers/gateways/queueHandler');

// Create mock instances
const createMockOperationQueue = () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  size: jest.fn().mockReturnValue(0),
  getPendingOperations: jest.fn().mockReturnValue([]),
  getFailedOperations: jest.fn().mockReturnValue([]),
  remove: jest.fn().mockResolvedValue(undefined),
});

const createMockIDMappingService = () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  getServerId: jest.fn().mockResolvedValue(null),
  getTempId: jest.fn().mockResolvedValue(null),
  registerMapping: jest.fn().mockResolvedValue(undefined),
});

const createMockHttpClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

const createMockNetworkProvider = () => ({
  isOnline: jest.fn(() => true),
  onNetworkChange: jest.fn(),
});

describe('BookHandlerIntegration', () => {
  let mockOperationQueue: ReturnType<typeof createMockOperationQueue>;
  let mockIDMappingService: ReturnType<typeof createMockIDMappingService>;
  let integration: BookHandlerIntegration;

  beforeEach(() => {
    mockOperationQueue = createMockOperationQueue();
    mockIDMappingService = createMockIDMappingService();
    integration = new BookHandlerIntegration(
      mockOperationQueue as jest.Mocked<OperationQueue>,
      mockIDMappingService as jest.Mocked<IDMappingService>
    );
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize once', async () => {
      await integration.initialize();
      expect(mockOperationQueue.initialize).toHaveBeenCalledTimes(1);
      expect(mockIDMappingService.initialize).toHaveBeenCalledTimes(1);

      // Second call should not initialize again
      await integration.initialize();
      expect(mockOperationQueue.initialize).toHaveBeenCalledTimes(1);
      expect(mockIDMappingService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should require initialization before creating handlers', () => {
      const httpClient = createMockHttpClient();
      const networkProvider = createMockNetworkProvider();

      expect(() => {
        integration.createIntegratedHandlers(httpClient, networkProvider);
      }).toThrow('BookHandlerIntegration must be initialized before use');
    });
  });

  describe('createIntegratedHandlers', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    it('should create all three handler types', () => {
      const httpClient = createMockHttpClient();
      const networkProvider = createMockNetworkProvider();

      const handlers = integration.createIntegratedHandlers(httpClient, networkProvider);

      expect(handlers.clientGateway).toBeDefined();
      expect(handlers.mobileHandler).toBeDefined();
      expect(handlers.queueHandler).toBeDefined();
    });

    it('should provide consistent handler interface', () => {
      const httpClient = createMockHttpClient();
      const networkProvider = createMockNetworkProvider();

      const handlers = integration.createIntegratedHandlers(httpClient, networkProvider);

      // All handlers should have the same methods
      for (const handler of Object.values(handlers)) {
        expect(typeof handler.create).toBe('function');
        expect(typeof handler.update).toBe('function');
        expect(typeof handler.delete).toBe('function');
        expect(typeof handler.read).toBe('function');
        expect(typeof handler.list).toBe('function');
      }
    });
  });

  describe('ID mapping integration', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    it('should create handlers with ID mapping wrapper', () => {
      const httpClient = createMockHttpClient();
      const networkProvider = createMockNetworkProvider();
      const handlers = integration.createIntegratedHandlers(httpClient, networkProvider);

      // Handlers should be wrapped and have the expected interface
      expect(handlers.clientGateway).toBeDefined();
      expect(typeof handlers.clientGateway.create).toBe('function');
      expect(typeof handlers.clientGateway.update).toBe('function');
      expect(typeof handlers.clientGateway.delete).toBe('function');
      
      expect(handlers.mobileHandler).toBeDefined();
      expect(handlers.queueHandler).toBeDefined();
    });
  });

  describe('getQueueStatus', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    it('should return queue status with book operation counts', async () => {
      // Mock queue data
      mockOperationQueue.size.mockReturnValue(10);
      mockOperationQueue.getPendingOperations.mockReturnValue([
        { resource: 'book', status: 'pending' },
        { resource: 'book', status: 'pending' },
        { resource: 'user', status: 'pending' },
      ]);
      mockOperationQueue.getFailedOperations.mockReturnValue([
        { resource: 'book', status: 'failed' },
        { resource: 'settings', status: 'failed' },
      ]);

      const status = await integration.getQueueStatus();

      expect(status).toEqual({
        totalOperations: 10,
        bookOperations: 3, // 2 pending + 1 failed
        pendingBooks: 2,
        failedBooks: 1,
      });
    });

    it('should handle empty queue', async () => {
      mockOperationQueue.size.mockReturnValue(0);
      mockOperationQueue.getPendingOperations.mockReturnValue([]);
      mockOperationQueue.getFailedOperations.mockReturnValue([]);

      const status = await integration.getQueueStatus();

      expect(status).toEqual({
        totalOperations: 0,
        bookOperations: 0,
        pendingBooks: 0,
        failedBooks: 0,
      });
    });
  });

  describe('clearFailedBooks', () => {
    beforeEach(async () => {
      await integration.initialize();
    });

    it('should remove only failed book operations', async () => {
      const failedOps = [
        { id: 'op1', resource: 'book', status: 'failed' },
        { id: 'op2', resource: 'user', status: 'failed' },
        { id: 'op3', resource: 'book', status: 'failed' },
      ];

      mockOperationQueue.getFailedOperations.mockReturnValue(failedOps);

      const removedCount = await integration.clearFailedBooks();

      expect(removedCount).toBe(2); // Only book operations
      expect(mockOperationQueue.remove).toHaveBeenCalledTimes(2);
      expect(mockOperationQueue.remove).toHaveBeenCalledWith('op1');
      expect(mockOperationQueue.remove).toHaveBeenCalledWith('op3');
      expect(mockOperationQueue.remove).not.toHaveBeenCalledWith('op2'); // user operation
    });

    it('should return 0 when no failed book operations exist', async () => {
      mockOperationQueue.getFailedOperations.mockReturnValue([
        { id: 'op1', resource: 'user', status: 'failed' },
      ]);

      const removedCount = await integration.clearFailedBooks();

      expect(removedCount).toBe(0);
      expect(mockOperationQueue.remove).not.toHaveBeenCalled();
    });
  });

  describe('singleton factory', () => {
    it('should return the same instance', () => {
      const queue1 = createMockOperationQueue();
      const idMapping1 = createMockIDMappingService();

      const instance1 = getBookHandlerIntegration(queue1 as jest.Mocked<OperationQueue>, idMapping1 as jest.Mocked<IDMappingService>);
      const instance2 = getBookHandlerIntegration(queue1 as jest.Mocked<OperationQueue>, idMapping1 as jest.Mocked<IDMappingService>);

      expect(instance1).toBe(instance2);
    });
  });

  describe('createIntegratedBookHandlers convenience function', () => {
    it('should create handlers with the expected interface', async () => {
      const httpClient = createMockHttpClient();
      const networkProvider = createMockNetworkProvider();
      const operationQueue = createMockOperationQueue();
      const idMappingService = createMockIDMappingService();

      const handlers = await createIntegratedBookHandlers(
        httpClient,
        networkProvider,
        operationQueue as jest.Mocked<OperationQueue>,
        idMappingService as jest.Mocked<IDMappingService>
      );

      expect(handlers.clientGateway).toBeDefined();
      expect(handlers.mobileHandler).toBeDefined();
      expect(handlers.queueHandler).toBeDefined();

      // Each handler should have the expected methods
      for (const handler of Object.values(handlers)) {
        expect(typeof handler.create).toBe('function');
        expect(typeof handler.update).toBe('function');
        expect(typeof handler.delete).toBe('function');
        expect(typeof handler.read).toBe('function');
        expect(typeof handler.list).toBe('function');
      }
    });
  });
});