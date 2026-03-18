import { BookHandlerFactory, Book, CreateBookPayload } from '../BookHandlers';
import { mobileHooks, MOBILE_EVENTS } from '../../hooks/mobileHooks';
import { createClientGateway } from '../gateways/clientGateway';
import type { HttpClient } from '../gateways/clientGateway';

const mockHttpClient: HttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock the mobile hooks to capture emitted events
jest.mock('../../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn().mockResolvedValue(undefined),
  },
  MOBILE_EVENTS: {
    BOOK: {
      CREATE: { BEFORE: 'book.create.before', AFTER: 'book.create.after', FAILURE: 'book.create.failure' },
      UPDATE: { BEFORE: 'book.update.before', AFTER: 'book.update.after', FAILURE: 'book.update.failure' },
      DELETE: { BEFORE: 'book.delete.before', AFTER: 'book.delete.after', FAILURE: 'book.delete.failure' },
    },
  },
}));

// Mock the gateway dependencies
jest.mock('../gateways/clientGateway', () => ({
  createClientGateway: jest.fn().mockReturnValue({
    create: jest.fn(),
    read: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }),
  createDefaultClientGatewayConfig: jest.fn().mockReturnValue({}),
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('BookHandlers Hookey Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileHooks.emit.mockResolvedValue(undefined);
  });

  describe('create method hookey integration', () => {
    it('should emit START and SUCCESS events for successful create', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const mockBook: Book = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockBook);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.create(createPayload);

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.BEFORE,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'book',
          timestamp: expect.any(String),
          metadata: expect.objectContaining({
            title: 'Test Book',
            author: 'Test Author',
            status: 'reading'
          })
        })
      );

      // Verify AFTER event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.AFTER,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'book',
          result: expect.objectContaining({
            book: mockBook
          })
        })
      );

      // Verify events were called in correct order
      const calls = mockMobileHooks.emit.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toBe(MOBILE_EVENTS.BOOK.CREATE.BEFORE);
      expect(calls[1][0]).toBe(MOBILE_EVENTS.BOOK.CREATE.AFTER);
    });

    it('should emit BEFORE and FAILURE events for failed create', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      // Mock the underlying gateway to throw error
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockRejectedValue(new Error('Create failed'));

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      
      await expect(bookHandler.create(createPayload)).rejects.toThrow('Create failed');

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.BEFORE,
        expect.objectContaining({
          resourceType: 'book'
        })
      );

      // Verify FAILURE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.FAILURE,
        expect.objectContaining({
          error: 'Create failed',
          errorType: 'unknown'
        })
      );
    });

    it('should emit FAILURE event with validation error type for validation failures', async () => {
      const invalidPayload = { title: '', author: 'Test Author', status: 'reading' } as CreateBookPayload;

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);

      await expect(bookHandler.create(invalidPayload)).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.FAILURE,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });

    it('should handle tempId result correctly', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      // Mock the underlying gateway to return tempId string
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue('temp-123');

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.create(createPayload);

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.AFTER,
        expect.objectContaining({
          result: expect.objectContaining({
            tempId: 'temp-123'
          })
        })
      );
    });
  });

  describe('delete method hookey integration', () => {
    it('should emit BEFORE and AFTER events for successful delete', async () => {
      const bookId = 'book-123';

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.delete.mockResolvedValue(undefined);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.delete(bookId);

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.DELETE.BEFORE,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'book',
          metadata: expect.objectContaining({
            bookId: bookId
          })
        })
      );

      // Verify AFTER event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.DELETE.AFTER,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'book'
        })
      );
    });

    it('should emit FAILURE event for invalid book ID', async () => {
      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);

      await expect(bookHandler.delete('')).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.DELETE.FAILURE,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('event metadata consistency', () => {
    it('should include consistent operationId across events in same operation', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const mockBook: Book = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockBook);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.create(createPayload);

      const calls = mockMobileHooks.emit.mock.calls;
      const startCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.BOOK.CREATE.BEFORE);
      const successCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.BOOK.CREATE.AFTER);

      expect((startCall[1] as Record<string, unknown>).operationId).toBeDefined();
      expect((successCall[1] as Record<string, unknown>).operationId).toBe((startCall[1] as Record<string, unknown>).operationId);
    });

    it('should include timestamp in all events', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const mockBook: Book = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockBook);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1] as Record<string, unknown>;
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });
    });

    it('should include resourceType as "book" in all events', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const mockBook: Book = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockBook);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);
      await bookHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1] as Record<string, unknown>;
        expect(metadata.resourceType).toBe('book');
      });
    });
  });

  describe('fire and forget behavior', () => {
    it('should emit events without awaiting and continue operation', async () => {
      const createPayload: CreateBookPayload = {
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading'
      };

      const mockBook: Book = {
        id: 'book-123',
        title: 'Test Book',
        author: 'Test Author',
        status: 'reading',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockBook);

      const bookHandler = BookHandlerFactory.createClientGateway(mockHttpClient);

      // Handler should work normally with fire-and-forget hooks
      const result = await bookHandler.create(createPayload);
      
      expect(result).toBe(mockBook);
      
      // Verify hooks were called
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.BEFORE,
        expect.any(Object)
      );
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.AFTER,
        expect.any(Object)
      );
    });
  });
});
