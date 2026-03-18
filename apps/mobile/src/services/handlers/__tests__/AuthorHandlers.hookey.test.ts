import { AuthorHandlerFactory, Author, CreateAuthorPayload } from '../AuthorHandlers';
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
    AUTHOR: {
      CREATE: { BEFORE: 'author.create.before', AFTER: 'author.create.after', FAILURE: 'author.create.failure' },
      UPDATE: { BEFORE: 'author.update.before', AFTER: 'author.update.after', FAILURE: 'author.update.failure' },
      DELETE: { BEFORE: 'author.delete.before', AFTER: 'author.delete.after', FAILURE: 'author.delete.failure' },
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

describe('AuthorHandlers Hookey Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileHooks.emit.mockResolvedValue(undefined);
  });

  describe('create method hookey integration', () => {
    it('should emit BEFORE and AFTER events for successful create', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      const mockAuthor: Author = {
        id: 'author-123',
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      await authorHandler.create(createPayload);

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.BEFORE,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author',
          timestamp: expect.any(String),
          metadata: expect.objectContaining({
            name: 'Test Author',
            bio: 'Test author biography',
            nationality: 'American'
          })
        })
      );

      // Verify AFTER event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.AFTER,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author',
          result: expect.objectContaining({
            author: mockAuthor
          })
        })
      );

      // Verify events were called in correct order
      const calls = mockMobileHooks.emit.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toBe(MOBILE_EVENTS.AUTHOR.CREATE.BEFORE);
      expect(calls[1][0]).toBe(MOBILE_EVENTS.AUTHOR.CREATE.AFTER);
    });

    it('should emit BEFORE and FAILURE events for failed create', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      // Mock the underlying gateway to throw error
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockRejectedValue(new Error('Create failed'));

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      
      await expect(authorHandler.create(createPayload)).rejects.toThrow('Create failed');

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.BEFORE,
        expect.objectContaining({
          resourceType: 'author'
        })
      );

      // Verify FAILURE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.FAILURE,
        expect.objectContaining({
          error: 'Create failed',
          errorType: 'unknown'
        })
      );
    });

    it('should emit FAILURE event with validation error type for validation failures', async () => {
      const invalidPayload = { name: '', bio: 'Test bio' } as CreateAuthorPayload;

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);

      await expect(authorHandler.create(invalidPayload)).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.FAILURE,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('delete method hookey integration', () => {
    it('should emit BEFORE and AFTER events for successful delete', async () => {
      const authorId = 'author-123';

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.delete.mockResolvedValue(undefined);

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      await authorHandler.delete(authorId);

      // Verify BEFORE event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.BEFORE,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author',
          metadata: expect.objectContaining({
            authorId: authorId
          })
        })
      );

      // Verify AFTER event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.AFTER,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author'
        })
      );
    });

    it('should emit FAILURE event for invalid author ID', async () => {
      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);

      await expect(authorHandler.delete('')).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.FAILURE,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('event metadata consistency', () => {
    it('should include consistent operationId across events in same operation', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      const mockAuthor: Author = {
        id: 'author-123',
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      await authorHandler.create(createPayload);

      const calls = mockMobileHooks.emit.mock.calls;
      const startCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.CREATE.BEFORE);
      const successCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.CREATE.AFTER);

      expect((startCall[1] as Record<string, unknown>).operationId).toBeDefined();
      expect((successCall[1] as Record<string, unknown>).operationId).toBe((startCall[1] as Record<string, unknown>).operationId);
    });

    it('should include timestamp in all events', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      const mockAuthor: Author = {
        id: 'author-123',
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      await authorHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1] as Record<string, unknown>;
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });
    });

    it('should include resourceType as "author" in all events', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      const mockAuthor: Author = {
        id: 'author-123',
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway(mockHttpClient);
      await authorHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1] as Record<string, unknown>;
        expect(metadata.resourceType).toBe('author');
      });
    });
  });
});
