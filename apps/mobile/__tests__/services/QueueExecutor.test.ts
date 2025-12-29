// Test for QueueExecutor

describe('QueueExecutor', () => {
  it('should determine retriable errors correctly', () => {
    delete require.cache[require.resolve('../../src/services/QueueExecutor')];
    const { isRetriableError } = require('../../src/services/QueueExecutor');

    // Network errors are retriable
    expect(isRetriableError(new Error('Network request failed'))).toBe(true);
    expect(isRetriableError({ message: 'timeout' })).toBe(true);
    expect(isRetriableError({ message: 'offline' })).toBe(true);

    // Validation errors are not retriable
    expect(isRetriableError({ status: 400 })).toBe(false);
    expect(isRetriableError({ status: 422 })).toBe(false);

    // Timeout is retriable
    expect(isRetriableError({ status: 408 })).toBe(true);

    // Server errors are retriable
    expect(isRetriableError({ status: 500 })).toBe(true);
    expect(isRetriableError({ status: 503 })).toBe(true);
  });

  it('should execute book operations', async () => {
    const mockBookAPI = {
      createBook: jest.fn().mockResolvedValue({}),
      updateBook: jest.fn().mockResolvedValue({}),
      deleteBook: jest.fn().mockResolvedValue({}),
    };

    jest.doMock('../../src/services/api', () => ({
      bookAPI: mockBookAPI,
    }));

    delete require.cache[require.resolve('../../src/services/QueueExecutor')];
    const { executeOperation } = require('../../src/services/QueueExecutor');

    await executeOperation({
      id: '1',
      type: 'CREATE',
      resource: 'book',
      payload: { title: 'Test' },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: 'pending',
    });

    expect(mockBookAPI.createBook).toHaveBeenCalled();
  });
});
