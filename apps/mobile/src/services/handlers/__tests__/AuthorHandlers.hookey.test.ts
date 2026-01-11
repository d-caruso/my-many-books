import { AuthorHandlerFactory, Author, CreateAuthorPayload } from '../AuthorHandlers';
import { mobileHooks, MOBILE_EVENTS } from '../../hooks/mobileHooks';

// Mock the mobile hooks to capture emitted events
jest.mock('../../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn().mockResolvedValue(undefined),
  },
  MOBILE_EVENTS: {
    AUTHOR: {
      CREATE: { START: 'author.create.start', SUCCESS: 'author.create.success', FAILED: 'author.create.failed' },
      read: { START: 'author.read.start', SUCCESS: 'author.read.success', FAILED: 'author.read.failed' },
      UPDATE: { START: 'author.update.start', SUCCESS: 'author.update.success', FAILED: 'author.update.failed' },
      DELETE: { START: 'author.delete.start', SUCCESS: 'author.delete.success', FAILED: 'author.delete.failed' },
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
    it('should emit START and SUCCESS events for successful create', async () => {
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
      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      await authorHandler.create(createPayload);

      // Verify START event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.START,
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

      // Verify SUCCESS event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.SUCCESS,
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
      expect(calls[0][0]).toBe(MOBILE_EVENTS.AUTHOR.CREATE.START);
      expect(calls[1][0]).toBe(MOBILE_EVENTS.AUTHOR.CREATE.SUCCESS);
    });

    it('should emit START and FAILED events for failed create', async () => {
      const createPayload: CreateAuthorPayload = {
        name: 'Test Author',
        bio: 'Test author biography',
        nationality: 'American'
      };

      // Mock the underlying gateway to throw error
      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.create.mockRejectedValue(new Error('Create failed'));

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      
      await expect(authorHandler.create(createPayload)).rejects.toThrow('Create failed');

      // Verify START event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.START,
        expect.objectContaining({
          resourceType: 'author'
        })
      );

      // Verify FAILED event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.FAILED,
        expect.objectContaining({
          error: 'Create failed',
          errorType: 'unknown'
        })
      );
    });

    it('should emit FAILED event with validation error type for validation failures', async () => {
      const invalidPayload = { name: '', bio: 'Test bio' } as CreateAuthorPayload;

      const authorHandler = AuthorHandlerFactory.createClientGateway({});

      await expect(authorHandler.create(invalidPayload)).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.CREATE.FAILED,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('delete method hookey integration', () => {
    it('should emit START and SUCCESS events for successful delete', async () => {
      const authorId = 'author-123';

      // Mock the underlying gateway to return success
      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.delete.mockResolvedValue(undefined);

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      await authorHandler.delete(authorId);

      // Verify START event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.START,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author',
          metadata: expect.objectContaining({
            authorId: authorId
          })
        })
      );

      // Verify SUCCESS event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.SUCCESS,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'author'
        })
      );
    });

    it('should emit FAILED event for invalid author ID', async () => {
      const authorHandler = AuthorHandlerFactory.createClientGateway({});

      await expect(authorHandler.delete('')).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.AUTHOR.DELETE.FAILED,
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

      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      await authorHandler.create(createPayload);

      const calls = mockMobileHooks.emit.mock.calls;
      const startCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.CREATE.START);
      const successCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.CREATE.SUCCESS);

      expect(startCall[1].operationId).toBeDefined();
      expect(successCall[1].operationId).toBe(startCall[1].operationId);
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

      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      await authorHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1];
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

      const mockGateway = require('../gateways/clientGateway').createClientGateway();
      mockGateway.create.mockResolvedValue(mockAuthor);

      const authorHandler = AuthorHandlerFactory.createClientGateway({});
      await authorHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1];
        expect(metadata.resourceType).toBe('author');
      });
    });
  });
});