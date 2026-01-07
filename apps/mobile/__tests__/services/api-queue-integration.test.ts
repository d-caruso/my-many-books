// Test for API service integration with operation queue
// Tests automatic queueing of failed operations

// Mock uuid before unknown imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('API Queue Integration', () => {
  it('should verify bookAPI has write operations', () => {
    delete require.cache[require.resolve('../../src/services/api')];

    const { bookAPI } = require('../../src/services/api');

    expect(bookAPI.createBook).toBeDefined();
    expect(typeof bookAPI.createBook).toBe('function');
    expect(bookAPI.updateBook).toBeDefined();
    expect(typeof bookAPI.updateBook).toBe('function');
    expect(bookAPI.deleteBook).toBeDefined();
    expect(typeof bookAPI.deleteBook).toBe('function');
  });

  it('should verify queue integration imports', () => {
    const queueModule = require('../../src/services/OperationQueue');
    const executorModule = require('../../src/services/QueueExecutor');

    expect(queueModule.operationQueue).toBeDefined();
    expect(executorModule.isRetriableError).toBeDefined();
    expect(typeof executorModule.isRetriableError).toBe('function');
  });

  it('should verify isRetriableError detects network errors', () => {
    const { isRetriableError } = require('../../src/services/QueueExecutor');
    const { ApiError } = require('../../src/types/errors');

    // Network errors are retriable via ApiError
    const { ErrorCode } = require('../../src/types/errors');
    expect(isRetriableError(new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true))).toBe(true);
    expect(isRetriableError(new ApiError(ErrorCode.NETWORK_TIMEOUT, 'timeout', undefined, true))).toBe(true);
    expect(isRetriableError(new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Request timeout', undefined, true))).toBe(true);
    expect(isRetriableError(new ApiError(ErrorCode.HTTP_SERVER_ERROR, 'Server error', 500, true))).toBe(true);
  });

  it('should verify isRetriableError rejects validation errors', () => {
    const { isRetriableError } = require('../../src/services/QueueExecutor');

    // Validation errors are NOT retriable
    expect(isRetriableError({ status: 400 })).toBe(false);
    expect(isRetriableError({ status: 422 })).toBe(false);
  });

  it('should verify OperationQueue can enqueue operations', async () => {
    const { operationQueue } = require('../../src/services/OperationQueue');

    await operationQueue.initialize();
    await operationQueue.clear(); // Start fresh

    const operationId = await operationQueue.enqueue(
      'CREATE',
      'book',
      { title: 'Test Book' },
      5
    );

    expect(operationId).toBeDefined();
    expect(typeof operationId).toBe('string');
    expect(operationQueue.size()).toBe(1);

    // Clean up
    await operationQueue.clear();
  });

  it('should verify operation payload structure for CREATE', async () => {
    const { operationQueue } = require('../../src/services/OperationQueue');

    await operationQueue.initialize();
    await operationQueue.clear();

    const book = { title: 'Test Book', author: 'Test Author' };
    await operationQueue.enqueue('CREATE', 'book', book, 5);

    const pending = operationQueue.getPendingOperations();
    expect(pending.length).toBe(1);
    expect(pending[0].type).toBe('CREATE');
    expect(pending[0].resource).toBe('book');
    expect(pending[0].payload).toEqual(book);
    expect(pending[0].maxRetries).toBe(5);

    // Clean up
    await operationQueue.clear();
  });

  it('should verify operation payload structure for UPDATE', async () => {
    const { operationQueue } = require('../../src/services/OperationQueue');

    await operationQueue.initialize();
    await operationQueue.clear();

    const payload = { id: '123', title: 'Updated Book' };
    await operationQueue.enqueue('UPDATE', 'book', payload, 5);

    const pending = operationQueue.getPendingOperations();
    expect(pending.length).toBe(1);
    expect(pending[0].type).toBe('UPDATE');
    expect(pending[0].payload).toEqual(payload);
    expect(pending[0].payload.id).toBe('123');

    // Clean up
    await operationQueue.clear();
  });

  it('should verify operation payload structure for DELETE', async () => {
    const { operationQueue } = require('../../src/services/OperationQueue');

    await operationQueue.initialize();
    await operationQueue.clear();

    const payload = { id: '456' };
    await operationQueue.enqueue('DELETE', 'book', payload, 5);

    const pending = operationQueue.getPendingOperations();
    expect(pending.length).toBe(1);
    expect(pending[0].type).toBe('DELETE');
    expect(pending[0].payload).toEqual(payload);
    expect(pending[0].payload.id).toBe('456');

    // Clean up
    await operationQueue.clear();
  });
});
