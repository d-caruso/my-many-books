// Test for OperationQueue service

describe('OperationQueue', () => {
  let mockAsyncStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAsyncStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
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

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    expect(queue.size()).toBe(0);
  });

  it('should load queue from AsyncStorage', async () => {
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
    ]);
    mockAsyncStorage.getItem.mockResolvedValue(storedQueue);

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
    await queue.initialize();

    expect(queue.size()).toBe(1);
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    delete require.cache[require.resolve('../../src/services/OperationQueue')];
    const { OperationQueue } = require('../../src/services/OperationQueue');

    const queue = new OperationQueue();
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
});
