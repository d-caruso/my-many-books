// Test for OperationQueue service
import type { QueuedOperation, OperationType, ResourceType, BookOperationPayload } from '../../src/types/queue';
import type { OperationQueue } from '../../src/services/OperationQueue';

// Mock interfaces
interface MockAsyncStorage {
  getItem: jest.MockedFunction<(key: string) => Promise<string | null>>;
  setItem: jest.MockedFunction<(key: string, value: string) => Promise<void>>;
  removeItem: jest.MockedFunction<(key: string) => Promise<void>>;
}

interface MockApiExecutor {
  (operation: QueuedOperation): Promise<void>;
}

// Timer ID type for setTimeout mock
type TimerId = ReturnType<typeof setTimeout>;

describe('OperationQueue', () => {
  let mockAsyncStorage: MockAsyncStorage;
  let OperationQueueClass: typeof OperationQueue;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAsyncStorage = {
      getItem: jest.fn() as jest.MockedFunction<(key: string) => Promise<string | null>>,
      setItem: jest.fn() as jest.MockedFunction<(key: string, value: string) => Promise<void>>,
      removeItem: jest.fn() as jest.MockedFunction<(key: string) => Promise<void>>,
    };

    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: mockAsyncStorage,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should initialize with empty queue', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);

    // Import OperationQueue after mocking AsyncStorage  
    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');
    OperationQueueClass = OperationQueue;

    const queue = new OperationQueueClass();
    await queue.initialize();

    expect(queue.size()).toBe(0);
  });

  it('should load queue from AsyncStorage', async () => {
    const storedQueue = JSON.stringify([
      {
        id: 'test-1',
        type: 'CREATE' as OperationType,
        resource: 'book' as ResourceType,
        payload: {} as BookOperationPayload,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
      },
    ]);
    mockAsyncStorage.getItem.mockResolvedValue(storedQueue);

    // Import OperationQueue after mocking AsyncStorage  
    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');
    OperationQueueClass = OperationQueue;

    const queue = new OperationQueueClass();
    await queue.initialize();

    expect(queue.size()).toBe(1);
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    // Import OperationQueue after mocking AsyncStorage  
    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');
    OperationQueueClass = OperationQueue;

    const queue = new OperationQueueClass();
    await queue.initialize();

    expect(queue.size()).toBe(0);
  });

  it('should enqueue operations', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    const operationId = await queue.enqueue('CREATE', 'book', { title: 'Test' });

    expect(operationId).toBeDefined();
    expect(queue.size()).toBe(1);
  });

  it('should enforce queue size limit', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    // Add 101 operations (over limit of 100)
    for (let i = 0; i < 101; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    expect(queue.size()).toBe(100);
  });

  it('should detect when queue is near limit', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    // Add 81 operations (over 80% threshold)
    for (let i = 0; i < 81; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    expect(queue.isNearLimit()).toBe(true);
  });

  it('should dequeue operations', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    const operationId = await queue.enqueue('CREATE', 'book', { title: 'Test' });
    await queue.dequeue(operationId);

    expect(queue.size()).toBe(0);
  });

  it('should get pending operations', async () => {
    const storedQueue = JSON.stringify([
      {
        id: 'test-1',
        type: 'CREATE',
        resource: 'book',
        payload: {},
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending',
      },
      {
        id: 'test-2',
        type: 'UPDATE',
        resource: 'book',
        payload: {},
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
        status: 'failed',
      },
    ]);
    mockAsyncStorage.getItem.mockResolvedValue(storedQueue);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    const pending = queue.getPendingOperations();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('pending');
  });

  it('should clear queue', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    await queue.enqueue('CREATE', 'book', { title: 'Test' });
    await queue.clear();

    expect(queue.size()).toBe(0);
  });

  it('should emit SIZE_CHANGED event when approaching queue limit', async () => {
    // Mock mobile hooks
    const mockEmit = jest.fn();
    jest.doMock('../../src/services/hooks/mobileHooks', () => {
      // Import the actual event constants
      const actualMobileHooks = jest.requireActual('../../src/services/hooks/mobileHooks');
      
      return {
        mobileHooks: { emit: mockEmit },
        // Use actual MOBILE_EVENTS instead of hard-coded strings
        MOBILE_EVENTS: actualMobileHooks.MOBILE_EVENTS,
      };
    });
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    // Add 81 operations to trigger warning (80% of 100)
    for (let i = 0; i < 81; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    const { MOBILE_EVENTS } = require('../../src/services/hooks/mobileHooks');
    expect(mockEmit).toHaveBeenCalledWith(
      MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
      expect.objectContaining({
        status: 'approaching_limit',
        threshold: 0.8
      })
    );
  });

  it('should test exponential backoff behavior', async () => {
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);

    let actualDelay = 0;
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
      actualDelay = delay;
      callback();
      return 'timeout-id' as unknown;
    });

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    const mockApiExecutor = jest.fn()
      .mockRejectedValueOnce(new Error('First fail'))
      .mockRejectedValueOnce(new Error('Second fail'))
      .mockResolvedValueOnce(undefined);

    await queue.enqueue('CREATE', 'book', { title: 'Test' });
    
    // First attempt (no delay)
    await queue.processQueue(mockApiExecutor);
    expect(actualDelay).toBe(0);

    // Second attempt (2s delay)
    await queue.processQueue(mockApiExecutor);
    expect(actualDelay).toBe(2000);

    // Third attempt (4s delay) 
    await queue.processQueue(mockApiExecutor);
    expect(actualDelay).toBe(4000);

    global.setTimeout = originalSetTimeout;
  });
});
