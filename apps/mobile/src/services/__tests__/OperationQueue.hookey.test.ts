import AsyncStorage from '@react-native-async-storage/async-storage';
import { OperationQueue } from '../OperationQueue';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock mobile hooks to capture emitted events
jest.mock('../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn().mockResolvedValue(undefined),
  },
  MOBILE_EVENTS: {
    QUEUE: {
      ENQUEUE: 'queue.enqueue',
      RETRY: 'queue.retry',
      FAILED: 'queue.failed',
      SIZE_CHANGED: 'queue.size_changed',
    },
    ERROR: {
      STORAGE: 'error.storage',
    },
  },
}));

// Mock Alert and i18n to avoid React Native dependencies
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../i18n', () => ({
  t: jest.fn().mockReturnValue('Mocked translation'),
}));

// Mock database service
jest.mock('../database/DatabaseService', () => ({
  databaseService: {
    query: jest.fn(),
  },
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('OperationQueue Hookey Integration', () => {
  let queue: OperationQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileHooks.emit.mockResolvedValue(undefined);
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    
    queue = new OperationQueue();
  });

  describe('initialization hookey events', () => {
    it('should emit ERROR.STORAGE event when AsyncStorage initialization fails', async () => {
      const error = new Error('AsyncStorage failed');
      mockAsyncStorage.getItem.mockRejectedValue(error);

      await queue.initialize();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.STORAGE,
        expect.objectContaining({
          operation: 'queue_initialize',
          error: 'AsyncStorage failed',
          recovery: 'empty_queue_created'
        })
      );
    });

    it('should not emit events when initialization succeeds', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      await queue.initialize();

      expect(mockMobileHooks.emit).not.toHaveBeenCalled();
    });

    it('should handle existing queue data without errors', async () => {
      const existingQueue = [{
        id: 'op-123',
        type: 'create',
        resource: 'book',
        payload: { title: 'Test Book' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      }];
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQueue));

      await queue.initialize();

      expect(mockMobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('enqueue hookey events', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear(); // Clear initialization calls
    });

    it('should emit QUEUE.ENQUEUE event when operation is added', async () => {
      const operationId = await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.ENQUEUE,
        expect.objectContaining({
          operationId: operationId,
          type: 'create',
          resource: 'book',
          queueSize: 1,
          maxRetries: 3
        })
      );
    });

    it('should emit QUEUE.SIZE_CHANGED when approaching limit', async () => {
      // Mock isNearLimit to return true
      jest.spyOn(queue, 'isNearLimit').mockReturnValue(true);

      await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
        expect.objectContaining({
          queueSize: expect.any(Number),
          maxSize: 100,
          status: 'approaching_limit',
          threshold: 0.8
        })
      );
    });

    it('should emit QUEUE.SIZE_CHANGED when limit exceeded', async () => {
      // Fill queue to capacity (mock scenario)
      const mockQueue = Array.from({ length: 100 }, (_, i) => ({
        id: `op-${i}`,
        type: 'create',
        resource: 'book',
        payload: { title: `Book ${i}` },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      }));

      // Set the queue to be at capacity
      (queue as unknown as { queue: typeof mockQueue }).queue = mockQueue;

      await queue.enqueue('create', 'book', {
        id: 'book-new',
        title: 'New Book',
        author: 'New Author',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
        expect.objectContaining({
          status: 'limit_exceeded',
          action: 'discarded_oldest',
          discardedOperation: 'op-0'
        })
      );
    });
  });

  describe('persistence hookey events', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should emit ERROR.STORAGE when persistence fails', async () => {
      const error = new Error('Storage write failed');
      mockAsyncStorage.setItem.mockRejectedValue(error);

      await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.STORAGE,
        expect.objectContaining({
          operation: 'queue_persist',
          error: 'Storage write failed',
          queueSize: 1
        })
      );
    });

    it('should not emit storage error when persistence succeeds', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      // Should only emit ENQUEUE event, not storage error
      const storageCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.ERROR.STORAGE
      );
      expect(storageCalls).toHaveLength(0);
    });
  });

  describe('processing hookey events', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should emit QUEUE.RETRY when operation retries', async () => {
      // Add operation to queue
      await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author', 
        status: 'reading'
      });

      // Mock a failing API executor
      const mockApiExecutor = jest.fn().mockRejectedValue(new Error('API failed'));

      // Clear enqueue events
      mockMobileHooks.emit.mockClear();

      // Process the queue
      await queue.processQueue(mockApiExecutor);

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.RETRY,
        expect.objectContaining({
          operationId: expect.any(String),
          type: 'create',
          resource: 'book',
          retryCount: 1,
          maxRetries: 3,
          nextAttempt: 2
        })
      );
    });

    it('should emit QUEUE.FAILED when operation exceeds max retries', async () => {
      // Add operation to queue
      const operationId = await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      }, 1); // Set maxRetries to 1

      // Mock a failing API executor
      const mockApiExecutor = jest.fn().mockRejectedValue(new Error('API failed'));

      // Clear enqueue events  
      mockMobileHooks.emit.mockClear();

      // Process the queue (will fail and retry once, then fail permanently)
      await queue.processQueue(mockApiExecutor);

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.FAILED,
        expect.objectContaining({
          operationId: operationId,
          type: 'create',
          resource: 'book',
          retryCount: 1,
          maxRetries: 1,
          reason: 'max_retries_exceeded'
        })
      );
    });

    it('should not emit retry/failed events for successful operations', async () => {
      // Add operation to queue
      await queue.enqueue('create', 'book', {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      // Mock successful API executor
      const mockApiExecutor = jest.fn().mockResolvedValue({ success: true });

      // Clear enqueue events
      mockMobileHooks.emit.mockClear();

      // Process the queue
      await queue.processQueue(mockApiExecutor);

      // Should not emit RETRY or FAILED events
      const retryFailedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.RETRY || eventName === MOBILE_EVENTS.QUEUE.FAILED
      );
      expect(retryFailedCalls).toHaveLength(0);
    });
  });

  describe('event metadata validation', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should include operation details in all queue events', async () => {
      const operationId = await queue.enqueue('update', 'author', {
        id: 'author-123',
        name: 'Updated Author'
      }, 5);

      const enqueueCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.ENQUEUE
      );

      expect(enqueueCalls).toHaveLength(1);
      expect(enqueueCalls[0][1]).toEqual(expect.objectContaining({
        operationId: operationId,
        type: 'update',
        resource: 'author',
        queueSize: 1,
        maxRetries: 5
      }));
    });

    it('should handle different resource types correctly', async () => {
      const bookOperationId = await queue.enqueue('create', 'book', {
        title: 'Test Book'
      });

      const categoryOperationId = await queue.enqueue('delete', 'category', {
        id: 'cat-123'
      });

      const calls = mockMobileHooks.emit.mock.calls;
      
      expect(calls[0][1]).toEqual(expect.objectContaining({
        operationId: bookOperationId,
        resource: 'book',
        type: 'create'
      }));

      expect(calls[1][1]).toEqual(expect.objectContaining({
        operationId: categoryOperationId,
        resource: 'category',
        type: 'delete'
      }));
    });
  });

  describe('fire and forget behavior', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should emit events and continue queue operations normally', async () => {
      // Should be able to enqueue and emit events
      const operationId = await queue.enqueue('create', 'book', {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      });

      expect(operationId).toBeDefined();
      expect(typeof operationId).toBe('string');

      // Verify operation was added to queue
      expect(queue.size()).toBe(1);
      
      // Verify hookey events were emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.ENQUEUE,
        expect.objectContaining({
          operationId: operationId,
          type: 'create',
          resource: 'book'
        })
      );
    });

    it('should handle queue processing with fire-and-forget hooks', async () => {
      // Add operation
      await queue.enqueue('create', 'book', {
        title: 'Test Book'
      });

      // Mock successful API executor
      const mockApiExecutor = jest.fn().mockResolvedValue({ success: true });

      // Processing should work normally
      await expect(queue.processQueue(mockApiExecutor)).resolves.not.toThrow();

      // Operation should be removed from queue
      expect(queue.size()).toBe(0);
      
      // Verify hooks were called during processing
      expect(mockMobileHooks.emit).toHaveBeenCalled();
    });
  });
});