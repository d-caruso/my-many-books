import AsyncStorage from '@react-native-async-storage/async-storage';
import { OperationQueue } from '../OperationQueue';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { HEALTH_STATUS, RESOURCE_TYPES } from '@my-many-books/shared-types';
import { OPERATION_TYPES, QUEUE_SIZE_STATUS } from '../hooks/eventsSchema';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({ 
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock mobile hooks to capture emitted events
jest.mock('../hooks/mobileHooks', () => {
  // Import the actual event tree and constants
  const actualMobileHooks = jest.requireActual('../hooks/mobileHooks');
  
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    // Use the actual event tree instead of hard-coded strings
    MOBILE_EVENTS: actualMobileHooks.MOBILE_EVENTS,
    QUEUE_OPERATION_STATUSES: actualMobileHooks.QUEUE_OPERATION_STATUSES,
  };
});

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
    executeQuery: jest.fn(),
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
        type: OPERATION_TYPES.CREATE,
        resource: RESOURCE_TYPES.BOOK,
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
      const operationId = await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.ENQUEUE,
        expect.objectContaining({
          operationId: operationId,
          type: OPERATION_TYPES.CREATE,
          resource: RESOURCE_TYPES.BOOK,
          queueSize: 1,
          maxRetries: 3
        })
      );
    });

    it('should emit QUEUE.SIZE_CHANGED when approaching limit', async () => {
      // Mock isNearLimit to return true
      jest.spyOn(queue, 'isNearLimit').mockReturnValue(true);

      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
        expect.objectContaining({
          queueSize: expect.any(Number),
          maxSize: 100,
          status: QUEUE_SIZE_STATUS.APPROACHING_LIMIT,
          threshold: 0.8
        })
      );
    });

    it('should emit QUEUE.SIZE_CHANGED when limit exceeded', async () => {
      // Fill queue to capacity (mock scenario)
      const mockQueue = Array.from({ length: 100 }, (_, i) => ({
        id: `op-${i}`,
        type: OPERATION_TYPES.CREATE,
        resource: RESOURCE_TYPES.BOOK,
        payload: { title: `Book ${i}` },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      }));

      // Set the queue to be at capacity
      (queue as unknown as { queue: typeof mockQueue }).queue = mockQueue;

      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-new',
        title: 'New Book',
        status: 'reading'
      });

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
        expect.objectContaining({
          status: QUEUE_SIZE_STATUS.LIMIT_EXCEEDED,
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

      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
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

      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
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
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
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
          type: OPERATION_TYPES.CREATE,
          resource: RESOURCE_TYPES.BOOK,
          retryCount: 1,
          maxRetries: 3,
          nextAttempt: 2
        })
      );
    });

    it('should emit QUEUE.FAILED when operation exceeds max retries', async () => {
      // Add operation to queue
      const operationId = await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
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
          type: OPERATION_TYPES.CREATE,
          resource: RESOURCE_TYPES.BOOK,
          retryCount: 0, // Reset to 0 for cross-session retry capability
          maxRetries: 1,
          reason: 'max_retries_exceeded',
          crossSessionRetries: 0
        })
      );
    });

    it('should not emit retry/failed events for successful operations', async () => {
      // Add operation to queue
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book',
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
      const operationId = await queue.enqueue(OPERATION_TYPES.UPDATE, RESOURCE_TYPES.AUTHOR, {
        id: 'author-123',
        name: 'Updated Author'
      }, 5);

      const enqueueCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.ENQUEUE
      );

      expect(enqueueCalls).toHaveLength(1);
      expect(enqueueCalls[0][1]).toEqual(expect.objectContaining({
        operationId: operationId,
        type: OPERATION_TYPES.UPDATE,
        resource: RESOURCE_TYPES.AUTHOR,
        queueSize: 1,
        maxRetries: 5
      }));
    });

    it('should handle different resource types correctly', async () => {
      const bookOperationId = await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        title: 'Test Book'
      });

      const categoryOperationId = await queue.enqueue(OPERATION_TYPES.DELETE, RESOURCE_TYPES.CATEGORY, {
        id: 'cat-123'
      });

      const calls = mockMobileHooks.emit.mock.calls;
      
      expect(calls[0][1]).toEqual(expect.objectContaining({
        operationId: bookOperationId,
        resource: RESOURCE_TYPES.BOOK,
        type: OPERATION_TYPES.CREATE
      }));

      expect(calls[1][1]).toEqual(expect.objectContaining({
        operationId: categoryOperationId,
        resource: RESOURCE_TYPES.CATEGORY,
        type: OPERATION_TYPES.DELETE
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
      const operationId = await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        title: 'Test Book',
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
          type: OPERATION_TYPES.CREATE,
          resource: RESOURCE_TYPES.BOOK
        })
      );
    });

    it('should handle queue processing with fire-and-forget hooks', async () => {
      // Add operation
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
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

  describe('new queue event integration', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should emit QUEUE.DEQUEUE event when operation is removed', async () => {
      // First add an operation
      const operationId = await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, {
        id: 'book-123',
        title: 'Test Book'
      });

      mockMobileHooks.emit.mockClear(); // Clear enqueue events

      // Remove the operation
      await queue.dequeue(operationId);

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.DEQUEUE,
        expect.objectContaining({
          operationId: operationId,
          type: OPERATION_TYPES.CREATE,
          resource: RESOURCE_TYPES.BOOK,
          queueSize: 0,
          remainingOperations: 0
        })
      );
    });

    it('should emit QUEUE.CLEARED event when queue is cleared', async () => {
      // Add some operations
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: 'Book 1' });
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.AUTHOR, { name: 'Author 1' });
      
      mockMobileHooks.emit.mockClear(); // Clear enqueue events

      // Clear the queue
      await queue.clear();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.CLEARED,
        expect.objectContaining({
          clearedOperations: 2,
          queueSize: 0,
          timestamp: expect.any(String),
          reason: 'manual_clear'
        })
      );
    });

    it('should emit QUEUE.PROCESS.START and QUEUE.PROCESS.COMPLETE events during processing', async () => {
      // Add operations
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: 'Book 1' });
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.AUTHOR, { name: 'Author 1' });

      // Mock successful API executor
      const mockApiExecutor = jest.fn().mockResolvedValue({ success: true });

      mockMobileHooks.emit.mockClear(); // Clear enqueue events

      // Process the queue
      await queue.processQueue(mockApiExecutor);

      // Check for PROCESS.START event
      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.PROCESS.START
      );
      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        queueSize: expect.any(Number),
        processableOperations: expect.any(Number),
        timestamp: expect.any(String),
        sessionId: expect.stringMatching(/^process-\d+$/)
      }));

      // Check for PROCESS.COMPLETE event
      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.PROCESS.COMPLETE
      );
      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        queueSize: expect.any(Number),
        processedOperations: expect.any(Number),
        failedOperations: expect.any(Number),
        processingDuration: expect.any(Number),
        timestamp: expect.any(String),
        sessionId: expect.stringMatching(/^process-\d+$/)
      }));
    });

    it('should track processing metrics correctly', async () => {
      // Add operations with mixed success/failure
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: 'Book 1' }, 1);
      await queue.enqueue(OPERATION_TYPES.CREATE, RESOURCE_TYPES.BOOK, { title: 'Book 2' }, 1);

      // Mock API executor with one success, one failure
      let callCount = 0;
      const mockApiExecutor = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ success: true });
        } else {
          return Promise.reject(new Error('API Error'));
        }
      });

      mockMobileHooks.emit.mockClear();

      // Process the queue
      await queue.processQueue(mockApiExecutor);

      // Check PROCESS.COMPLETE event has correct metrics
      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.QUEUE.PROCESS.COMPLETE
      );
      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        processedOperations: 1,
        failedOperations: 1,
        processingDuration: expect.any(Number)
      }));
    });
  });

  describe('queue health monitoring events', () => {
    beforeEach(async () => {
      await queue.initialize();
      mockMobileHooks.emit.mockClear();
    });

    it('should emit health metrics when getQueueHealth is called', () => {
      const health = queue.getQueueHealth();

      expect(health).toEqual(expect.objectContaining({
        total: expect.any(Number),
        pending: expect.any(Number),
        retrying: expect.any(Number),
        failed: expect.any(Number),
        healthScore: expect.any(Number),
        isHealthy: expect.any(Boolean)
      }));

      // Verify health metrics event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
        expect.objectContaining({
          total: expect.any(Number),
          healthScore: expect.any(Number),
          isHealthy: expect.any(Boolean),
          status: expect.stringMatching(
            new RegExp(`^(${HEALTH_STATUS.HEALTHY}|${HEALTH_STATUS.DEGRADED})$`)
          ),
          timestamp: expect.any(String)
        })
      );
    });

    it('should monitor queue health and emit warnings for stale operations', () => {
      // Mock an old operation (simulate stale)
      const staleTimestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      queue['queue'] = [{
        id: 'old-op',
        type: OPERATION_TYPES.CREATE,
        resource: RESOURCE_TYPES.BOOK,
        payload: { title: 'Old Book' },
        timestamp: staleTimestamp,
        retryCount: 0,
        maxRetries: 3,
        status: 'pending'
      }];

      mockMobileHooks.emit.mockClear();

      // Monitor health
      queue.monitorQueueHealth();

      // Should emit warning about stale operations
      const staleCalls = mockMobileHooks.emit.mock.calls.filter(
        ([_, payload]) => payload?.status === QUEUE_SIZE_STATUS.STALE_OPERATIONS
      );
      expect(staleCalls).toHaveLength(1);
      expect(staleCalls[0][1]).toEqual(expect.objectContaining({
        status: QUEUE_SIZE_STATUS.STALE_OPERATIONS,
        staleDuration: expect.any(Number),
        warning: 'operations_aging'
      }));
    });
  });
});