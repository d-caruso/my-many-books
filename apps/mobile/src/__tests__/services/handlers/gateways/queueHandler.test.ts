/**
 * Tests for QueueHandler implementation
 */

import {
  createQueueHandler,
  createDefaultQueueHandlerConfig,
  QueueHandlerFactory,
  QueueHandlerConfig,
} from '../../../../services/handlers/gateways/queueHandler';
import { QueueHandlerType } from '../../../../services/handlers/types/HandlerTypes';

// Mock queue implementation
const createMockQueue = () => {
  let operations: any[] = [];
  return {
    add: jest.fn((operation) => {
      operations.push(operation);
      return Promise.resolve(operation.id);
    }),
    size: jest.fn(() => operations.length),
    clear: jest.fn(() => { operations = []; }),
    getOperations: () => operations, // For testing
  };
};

// Mock book type
interface TestBook {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'completed';
  creationDate: string;
  updateDate: string;
}

describe('QueueHandler', () => {
  let mockQueue: ReturnType<typeof createMockQueue>;
  let config: QueueHandlerConfig;
  let handler: QueueHandlerType<TestBook>;

  beforeEach(() => {
    mockQueue = createMockQueue();
    config = {
      resourceType: 'book',
      queue: mockQueue,
      queueOptions: {
        generateOptimisticIds: true,
        idGenerationStrategy: 'uuid',
        validateBeforeQueue: true,
        deduplicateOperations: false,
        conflictResolution: 'last-write-wins',
      },
    };
    handler = createQueueHandler<TestBook>('book', config);
  });

  describe('createQueueHandler', () => {
    it('should create handler that queues CREATE operations', async () => {
      const tempId = await handler.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(tempId).toMatch(/^temp-/);
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE',
          resourceType: 'book',
          data: {
            title: 'Test Book',
            author: 'Test Author',
            status: 'reading',
          },
          timestamp: expect.any(Date),
          retryCount: 0,
        })
      );
    });

    it('should create handler that queues UPDATE operations', async () => {
      const tempId = await handler.update('book-1', {
        title: 'Updated Book',
        status: 'completed',
      });

      expect(tempId).toMatch(/^temp-/);
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UPDATE',
          resourceType: 'book',
          resourceId: 'book-1',
          data: {
            title: 'Updated Book',
            status: 'completed',
          },
        })
      );
    });

    it('should create handler that queues DELETE operations', async () => {
      const tempId = await handler.delete('book-1');

      expect(tempId).toMatch(/^temp-/);
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE',
          resourceType: 'book',
          resourceId: 'book-1',
        })
      );
    });

    it('should handle queue errors gracefully', async () => {
      mockQueue.add.mockRejectedValue(new Error('Queue full'));

      try {
        await handler.create({
          title: 'Test Book',
          author: 'Test Author',
          status: 'reading',
        });
        throw new Error('Should have thrown queue error');
      } catch (error: any) {
        expect(error.code).toBe('QUEUE_ERROR');
        expect(error.retryable).toBe(true);
        expect(error.message).toContain('Queue full');
      }
    });
  });

  describe('ID Generation Strategies', () => {
    it('should generate UUID-style temp IDs', async () => {
      const tempId = await handler.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(tempId).toMatch(/^temp-\d+-[a-z0-9]+$/);
    });

    it('should use timestamp strategy', async () => {
      const timestampConfig = {
        ...config,
        queueOptions: {
          ...config.queueOptions,
          idGenerationStrategy: 'timestamp' as const,
        },
      };
      const timestampHandler = createQueueHandler<TestBook>('book', timestampConfig);

      const tempId = await timestampHandler.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(tempId).toMatch(/^temp-\d+$/);
    });

    it('should use sequential strategy', async () => {
      const sequentialConfig = {
        ...config,
        queueOptions: {
          ...config.queueOptions,
          idGenerationStrategy: 'sequential' as const,
        },
      };
      const sequentialHandler = createQueueHandler<TestBook>('book', sequentialConfig);

      const tempId = await sequentialHandler.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(tempId).toMatch(/^temp-book-\d+$/);
    });
  });

  describe('Validation', () => {
    it('should skip validation when disabled', async () => {
      const noValidationConfig = {
        ...config,
        queueOptions: {
          ...config.queueOptions,
          validateBeforeQueue: false,
        },
      };
      const noValidationHandler = createQueueHandler<TestBook>('book', noValidationConfig);

      const tempId = await noValidationHandler.create(null as any);
      expect(tempId).toMatch(/^temp-/);
    });
  });

  describe('Optimistic ID Generation', () => {
    it('should generate optimistic IDs when enabled', async () => {
      const tempId = await handler.create({
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
      });

      expect(tempId).toMatch(/^temp-/);
    });

    it('should not generate optimistic IDs when disabled', async () => {
      const noOptimisticConfig = {
        ...config,
        queueOptions: {
          ...config.queueOptions,
          generateOptimisticIds: false,
        },
      };
      const noOptimisticHandler = createQueueHandler<TestBook>('book', noOptimisticConfig);

      const tempId = await noOptimisticHandler.update('existing-id', {
        title: 'Updated Book',
      });

      expect(tempId).toBe('existing-id'); // Uses the provided ID when optimistic IDs disabled
    });
  });
});

describe('createDefaultQueueHandlerConfig', () => {
  it('should create default configuration', () => {
    const mockQueue = createMockQueue();
    const defaultConfig = createDefaultQueueHandlerConfig('book', mockQueue);

    expect(defaultConfig.resourceType).toBe('book');
    expect(defaultConfig.queue).toBe(mockQueue);
    expect(defaultConfig.queueOptions.generateOptimisticIds).toBe(true);
    expect(defaultConfig.queueOptions.idGenerationStrategy).toBe('uuid');
    expect(defaultConfig.queueOptions.validateBeforeQueue).toBe(true);
    expect(defaultConfig.queueOptions.deduplicateOperations).toBe(true);
    expect(defaultConfig.queueOptions.conflictResolution).toBe('last-write-wins');
  });
});

describe('QueueHandlerFactory', () => {
  let factory: QueueHandlerFactory;
  let mockQueue: ReturnType<typeof createMockQueue>;

  beforeEach(() => {
    mockQueue = createMockQueue();
    const config = createDefaultQueueHandlerConfig('book', mockQueue);
    factory = new QueueHandlerFactory(config);
  });

  it('should create book handler', () => {
    const bookHandler = factory.createBookHandler<TestBook>();
    expect(bookHandler).toBeDefined();
    expect(typeof bookHandler.create).toBe('function');
  });

  it('should create author handler', () => {
    const authorHandler = factory.createAuthorHandler<TestBook>();
    expect(authorHandler).toBeDefined();
  });

  it('should create category handler', () => {
    const categoryHandler = factory.createCategoryHandler<TestBook>();
    expect(categoryHandler).toBeDefined();
  });

  it('should create custom handler', () => {
    const customHandler = factory.createHandler<TestBook>('custom');
    expect(customHandler).toBeDefined();
  });

  it('should update configuration', () => {
    factory.updateConfig({
      queueOptions: {
        generateOptimisticIds: false,
        idGenerationStrategy: 'timestamp',
        validateBeforeQueue: false,
        deduplicateOperations: false,
        conflictResolution: 'manual',
      },
    });

    expect(factory).toBeDefined();
  });

  it('should get queue status', () => {
    const status = factory.getQueueStatus();
    expect(status.size).toBe(0);
    expect(status.resourceType).toBe('book');
  });

  it('should clear queue', () => {
    factory.clearQueue();
    expect(mockQueue.clear).toHaveBeenCalled();
  });
});

describe('Handler Integration', () => {
  it('should work with multiple operations in sequence', async () => {
    const mockQueue = createMockQueue();
    const config = createDefaultQueueHandlerConfig('book', mockQueue);
    const handler = createQueueHandler<TestBook>('book', config);

    // Create operation
    const createId = await handler.create({
      title: 'Book 1',
      author: 'Author 1',
      status: 'reading',
    });

    // Update operation
    const updateId = await handler.update('temp-123', {
      title: 'Updated Book 1',
    });

    // Delete operation
    const deleteId = await handler.delete('temp-456');

    expect(mockQueue.size()).toBe(3);
    expect(createId).toMatch(/^temp-/);
    expect(updateId).toMatch(/^temp-/);
    expect(deleteId).toMatch(/^temp-/);
  });

  it('should maintain operation order', async () => {
    const mockQueue = createMockQueue();
    const config = createDefaultQueueHandlerConfig('book', mockQueue);
    const handler = createQueueHandler<TestBook>('book', config);

    await handler.create({ title: 'Book 1', author: 'Author 1', status: 'reading' });
    await handler.update('book-1', { title: 'Updated Book 1' });
    await handler.delete('book-1');

    const operations = mockQueue.getOperations();
    expect(operations).toHaveLength(3);
    expect(operations[0].type).toBe('CREATE');
    expect(operations[1].type).toBe('UPDATE');
    expect(operations[2].type).toBe('DELETE');
  });
});