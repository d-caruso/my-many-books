// Test for OperationQueue service
import type { ResourceType, BookOperationPayload } from '../../src/types/queue';
import type { OperationType } from '../../src/services/hooks/eventsSchema';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OperationQueue } from '../../src/services/OperationQueue';
import { mobileHooks, MOBILE_EVENTS } from '../../src/services/hooks/mobileHooks';

jest.mock('../../src/services/hooks/mobileHooks', () => {
  const actual = jest.requireActual<typeof import('../../src/services/hooks/mobileHooks')>(
    '../../src/services/hooks/mobileHooks'
  );
  return {
    mobileHooks: { emit: jest.fn() },
    MOBILE_EVENTS: actual.MOBILE_EVENTS,
  };
});

jest.mock('../../src/services/database/DatabaseService', () => ({
  databaseService: { executeQuery: jest.fn() },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockEmit = mobileHooks.emit as jest.MockedFunction<typeof mobileHooks.emit>;

describe('OperationQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it('should initialize with empty queue', async () => {
    const queue = new OperationQueue();
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

    const queue = new OperationQueue();
    await queue.initialize();

    expect(queue.size()).toBe(1);
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const queue = new OperationQueue();
    await queue.initialize();

    expect(queue.size()).toBe(0);
  });

  it('should enqueue operations', async () => {
    const queue = new OperationQueue();
    await queue.initialize();

    const operationId = await queue.enqueue('CREATE', 'book', { title: 'Test' });

    expect(operationId).toBeDefined();
    expect(queue.size()).toBe(1);
  });

  it('should enforce queue size limit', async () => {
    const queue = new OperationQueue();
    await queue.initialize();

    // Add 101 operations (over limit of 100)
    for (let i = 0; i < 101; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    expect(queue.size()).toBe(100);
  });

  it('should detect when queue is near limit', async () => {
    const queue = new OperationQueue();
    await queue.initialize();

    // Add 81 operations (over 80% threshold)
    for (let i = 0; i < 81; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    expect(queue.isNearLimit()).toBe(true);
  });

  it('should dequeue operations', async () => {
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

    const queue = new OperationQueue();
    await queue.initialize();

    const pending = queue.getPendingOperations();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('pending');
  });

  it('should clear queue', async () => {
    const queue = new OperationQueue();
    await queue.initialize();

    await queue.enqueue('CREATE', 'book', { title: 'Test' });
    await queue.clear();

    expect(queue.size()).toBe(0);
  });

  it('should emit SIZE_CHANGED event when approaching queue limit', async () => {
    const queue = new OperationQueue();
    await queue.initialize();

    // Add 81 operations to trigger warning (80% of 100)
    for (let i = 0; i < 81; i++) {
      await queue.enqueue('CREATE', 'book', { title: `Book ${i}` });
    }

    expect(mockEmit).toHaveBeenCalledWith(
      MOBILE_EVENTS.QUEUE.SIZE_CHANGED,
      expect.objectContaining({
        status: 'approaching_limit',
        threshold: 0.8,
      })
    );
  });

  it('should test exponential backoff behavior', async () => {
    let actualDelay = 0;
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
      actualDelay = delay;
      callback();
      return 'timeout-id' as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

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
