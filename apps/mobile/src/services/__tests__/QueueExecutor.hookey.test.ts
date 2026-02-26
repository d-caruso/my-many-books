import { executeOperation, isRetriableError } from '../QueueExecutor';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { QUEUE_OPERATION_STATUSES } from '../hooks/eventsSchema';
import { ApiError, ErrorCode } from '../../types/errors';
import type { QueuedOperation } from '../../types/queue';

// Mock all external dependencies
jest.mock('../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn().mockResolvedValue(undefined),
  },
  MOBILE_EVENTS: {
    EXECUTOR: {
      OPERATION: {
        START: 'executor.operation.start',
        SUCCESS: 'executor.operation.success',
        FAILED: 'executor.operation.failed',
      },
      RETRY_SCHEDULED: 'executor.retry_scheduled',
      MAX_RETRIES_REACHED: 'executor.max_retries_reached',
      NETWORK_ERROR: 'executor.network_error',
      VALIDATION_ERROR: 'executor.validation_error',
      PERFORMANCE_METRIC: 'executor.performance_metric',
    },
  },
}));

jest.mock('../hooks/eventsSchema', () => {
  // Import the actual constants
  const actualEventsSchema = jest.requireActual('../hooks/eventsSchema');
  
  return {
    QUEUE_OPERATION_STATUSES: actualEventsSchema.QUEUE_OPERATION_STATUSES,
    OPERATION_TYPES: actualEventsSchema.OPERATION_TYPES,
    RESOURCE_TYPES: actualEventsSchema.RESOURCE_TYPES,
  };
});

// Mock API client
jest.mock('../api', () => ({
  apiClient: {
    books: {
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
    },
    authors: {
      createAuthor: jest.fn(),
      updateAuthor: jest.fn(),
      deleteAuthor: jest.fn(),
    },
    categories: {
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
    },
  },
}));

// Mock other services
jest.mock('../sync/IDMappingService', () => ({
  idMappingService: {
    resolveForeignKeys: jest.fn().mockResolvedValue({}),
    registerTempId: jest.fn(),
  },
}));

jest.mock('../database/BookRepository', () => ({
  bookRepository: {
    findByIdOrMapping: jest.fn(),
    replaceTempIdWithServerId: jest.fn(),
    updateSyncFields: jest.fn(),
  },
}));

jest.mock('../database/AuthorRepository', () => ({
  authorRepository: {
    findById: jest.fn(),
    updateSyncFields: jest.fn(),
  },
}));

jest.mock('../database/CategoryRepository', () => ({
  categoryRepository: {
    findById: jest.fn(),
    updateSyncFields: jest.fn(),
  },
}));

jest.mock('../sync/CleanupService', () => ({
  cleanupService: {
    updateForeignKeysForBook: jest.fn(),
  },
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('QueueExecutor Hookey Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeOperation', () => {
    const mockOperation: QueuedOperation = {
      id: 'test-op-123',
      type: 'CREATE',
      resource: 'book',
      payload: { title: 'Test Book' },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: QUEUE_OPERATION_STATUSES.PENDING,
    };

    it('should emit EXECUTOR.OPERATION.START when operation begins', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockResolvedValue({ id: 'server-123' });

      await executeOperation(mockOperation);

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.OPERATION.START
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        type: 'CREATE',
        resource: 'book',
        retryCount: 0,
        timestamp: expect.any(String),
        sessionId: expect.stringMatching(/^executor-\d+$/)
      }));
    });

    it('should emit EXECUTOR.OPERATION.SUCCESS when operation succeeds', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockResolvedValue({ id: 'server-123' });

      await executeOperation(mockOperation);

      const successCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.OPERATION.SUCCESS
      );

      expect(successCalls).toHaveLength(1);
      expect(successCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        type: 'CREATE',
        resource: 'book',
        retryCount: 0,
        executionDuration: expect.any(Number),
        timestamp: expect.any(String),
        sessionId: expect.stringMatching(/^executor-\d+$/)
      }));
    });

    it('should emit EXECUTOR.PERFORMANCE_METRIC for successful operations', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockResolvedValue({ id: 'server-123' });

      await executeOperation(mockOperation);

      const metricCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.PERFORMANCE_METRIC
      );

      expect(metricCalls).toHaveLength(1);
      expect(metricCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        type: 'CREATE',
        resource: 'book',
        executionDuration: expect.any(Number),
        retryCount: 0,
        performanceData: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          success: true
        })
      }));
    });

    it('should emit EXECUTOR.NETWORK_ERROR for network-related failures', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockRejectedValue(new Error('Network request failed'));

      await expect(executeOperation(mockOperation)).rejects.toThrow('Network request failed');

      const networkErrorCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.NETWORK_ERROR
      );

      expect(networkErrorCalls).toHaveLength(1);
      expect(networkErrorCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        type: 'CREATE',
        resource: 'book',
        retryCount: 0,
        error: 'Network request failed',
        errorType: 'network',
        executionDuration: expect.any(Number),
        timestamp: expect.any(String),
        sessionId: expect.stringMatching(/^executor-\d+$/)
      }));
    });

    it('should emit EXECUTOR.VALIDATION_ERROR for validation-related failures', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockRejectedValue(new Error('Validation failed: title is required'));

      await expect(executeOperation(mockOperation)).rejects.toThrow('Validation failed: title is required');

      const validationErrorCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.VALIDATION_ERROR
      );

      expect(validationErrorCalls).toHaveLength(1);
      expect(validationErrorCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        error: 'Validation failed: title is required',
        errorType: 'validation',
        executionDuration: expect.any(Number)
      }));
    });

    it('should emit EXECUTOR.OPERATION.FAILED for unknown errors', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockRejectedValue(new Error('Unexpected database error'));

      await expect(executeOperation(mockOperation)).rejects.toThrow('Unexpected database error');

      const failedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.OPERATION.FAILED
      );

      expect(failedCalls).toHaveLength(1);
      expect(failedCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-123',
        error: 'Unexpected database error',
        errorType: 'unknown',
        executionDuration: expect.any(Number)
      }));
    });

    it('should emit EXECUTOR.PERFORMANCE_METRIC for failed operations', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockRejectedValue(new Error('Operation failed'));

      await expect(executeOperation(mockOperation)).rejects.toThrow('Operation failed');

      const metricCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.PERFORMANCE_METRIC
      );

      expect(metricCalls).toHaveLength(1);
      expect(metricCalls[0][1]).toEqual(expect.objectContaining({
        performanceData: expect.objectContaining({
          success: false,
          error: 'Operation failed'
        })
      }));
    });

    it('should handle different resource types correctly', async () => {
      const { apiClient } = require('../api');
      
      const authorOperation: QueuedOperation = {
        ...mockOperation,
        resource: 'author',
        payload: { name: 'Test Author' }
      };

      apiClient.authors.createAuthor.mockResolvedValue({ id: 'author-123' });

      await executeOperation(authorOperation);

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.OPERATION.START
      );

      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        resource: 'author'
      }));
    });
  });

  describe('isRetriableError with hookey integration', () => {
    it('should emit EXECUTOR.RETRY_SCHEDULED for retriable errors within retry limit', () => {
      const error = new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true);
      const operationId = 'test-op-456';
      const currentRetryCount = 1;
      const maxRetries = 3;

      const result = isRetriableError(error, operationId, currentRetryCount, maxRetries);

      expect(result).toBe(true);

      const retryCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED
      );

      expect(retryCalls).toHaveLength(1);
      expect(retryCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-456',
        retryCount: 1,
        maxRetries: 3,
        nextRetryIn: 2000, // 2^1 * 1000 = 2s
        retryReason: 'structured_api_error',
        error: 'Network request failed',
        timestamp: expect.any(String),
        backoffStrategy: 'exponential'
      }));
    });

    it('should emit EXECUTOR.MAX_RETRIES_REACHED when retry limit exceeded', () => {
      const error = new ApiError(ErrorCode.NETWORK_TIMEOUT, 'Persistent timeout', undefined, true);
      const operationId = 'test-op-789';
      const currentRetryCount = 3;
      const maxRetries = 3;

      const result = isRetriableError(error, operationId, currentRetryCount, maxRetries);

      expect(result).toBe(true); // Still retriable, but max retries reached

      const maxRetriesCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.MAX_RETRIES_REACHED
      );

      expect(maxRetriesCalls).toHaveLength(1);
      expect(maxRetriesCalls[0][1]).toEqual(expect.objectContaining({
        operationId: 'test-op-789',
        retryCount: 3,
        maxRetries: 3,
        finalError: 'Persistent timeout',
        retryReason: 'structured_api_error',
        timestamp: expect.any(String),
        abandoned: true
      }));
    });

    it('should calculate exponential backoff correctly', () => {
      const error = new Error('HTTP 500: Server Error');

      // First retry
      isRetriableError(error, 'op-1', 0, 3);
      let retryCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED
      );
      expect(retryCalls[0][1].nextRetryIn).toBe(1000); // 2^0 * 1000 = 1s

      jest.clearAllMocks();

      // Second retry
      isRetriableError(error, 'op-2', 1, 3);
      retryCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED
      );
      expect(retryCalls[0][1].nextRetryIn).toBe(2000); // 2^1 * 1000 = 2s

      jest.clearAllMocks();

      // Third retry
      isRetriableError(error, 'op-3', 2, 3);
      retryCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED
      );
      expect(retryCalls[0][1].nextRetryIn).toBe(4000); // 2^2 * 1000 = 4s
    });

    it('should not emit events when operation details not provided', () => {
      const error = new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true);
      
      const result = isRetriableError(error); // No operation details
      
      expect(result).toBe(true);
      expect(mockMobileHooks.emit).not.toHaveBeenCalled();
    });

    it('should categorize different error types correctly', () => {
      const testCases = [
        { error: new ApiError(ErrorCode.NETWORK_FAILED, 'Network request failed', undefined, true), expectedReason: 'structured_api_error' },
        { error: new ApiError(ErrorCode.NETWORK_TIMEOUT, 'timeout', undefined, true), expectedReason: 'structured_api_error' },
        { error: new ApiError(ErrorCode.NETWORK_OFFLINE, 'offline', undefined, true), expectedReason: 'structured_api_error' },
        { error: new Error('HTTP 500: Server Error'), expectedReason: 'server_error_message' },
        { error: new Error('HTTP 408: Request Timeout'), expectedReason: 'request_timeout_message' },
        { error: new Error('HTTP 429: Too Many Requests'), expectedReason: 'rate_limit_message' },
      ];

      testCases.forEach(({ error, expectedReason }, index) => {
        jest.clearAllMocks();
        isRetriableError(error, `op-${index}`, 0, 3);
        
        const retryCalls = mockMobileHooks.emit.mock.calls.filter(
          ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED
        );
        
        expect(retryCalls[0][1].retryReason).toBe(expectedReason);
      });
    });
  });

  describe('error categorization', () => {
    const mockOperation: QueuedOperation = {
      id: 'test-categorization',
      type: 'CREATE',
      resource: 'book',
      payload: { title: 'Test Book' },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      status: QUEUE_OPERATION_STATUSES.PENDING,
    };

    it('should correctly categorize network errors', async () => {
      const { apiClient } = require('../api');
      const networkErrors = [
        'Network request failed',
        'timeout occurred',
        'connection refused',
        'HTTP 503: Service Unavailable'
      ];

      for (const errorMessage of networkErrors) {
        jest.clearAllMocks();
        apiClient.books.createBook.mockRejectedValue(new Error(errorMessage));

        await expect(executeOperation(mockOperation)).rejects.toThrow(errorMessage);

        const networkErrorCalls = mockMobileHooks.emit.mock.calls.filter(
          ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.NETWORK_ERROR
        );

        expect(networkErrorCalls).toHaveLength(1);
        expect(networkErrorCalls[0][1].errorType).toBe('network');
      }
    });

    it('should correctly categorize validation errors', async () => {
      const { apiClient } = require('../api');
      const validationErrors = [
        'validation failed',
        'required field missing',
        'invalid input format',
        'HTTP 400: Bad Request'
      ];

      for (const errorMessage of validationErrors) {
        jest.clearAllMocks();
        apiClient.books.createBook.mockRejectedValue(new Error(errorMessage));

        await expect(executeOperation(mockOperation)).rejects.toThrow(errorMessage);

        const validationErrorCalls = mockMobileHooks.emit.mock.calls.filter(
          ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.VALIDATION_ERROR
        );

        expect(validationErrorCalls).toHaveLength(1);
        expect(validationErrorCalls[0][1].errorType).toBe('validation');
      }
    });
  });

  describe('performance metrics tracking', () => {
    it('should track execution duration accurately', async () => {
      const { apiClient } = require('../api');
      apiClient.books.createBook.mockResolvedValue({ id: 'test-123' });

      const mockOperation: QueuedOperation = {
        id: 'perf-test',
        type: 'CREATE',
        resource: 'book',
        payload: { title: 'Performance Test Book' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: QUEUE_OPERATION_STATUSES.PENDING,
      };

      await executeOperation(mockOperation);

      const metricCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.EXECUTOR.PERFORMANCE_METRIC
      );

      expect(metricCalls).toHaveLength(1);
      expect(metricCalls[0][1].executionDuration).toBeGreaterThanOrEqual(0);
      expect(metricCalls[0][1].performanceData.startTime).toBeGreaterThan(0);
      expect(metricCalls[0][1].performanceData.endTime).toBeGreaterThan(0);
      expect(metricCalls[0][1].performanceData.success).toBe(true);
    });
  });
});