import { CategoryHandlerFactory, Category, CreateCategoryPayload } from '../CategoryHandlers';
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
    CATEGORY: {
      CREATE: { START: 'category.create.start', SUCCESS: 'category.create.success', FAILED: 'category.create.failed' },
      read: { START: 'category.read.start', SUCCESS: 'category.read.success', FAILED: 'category.read.failed' },
      UPDATE: { START: 'category.update.start', SUCCESS: 'category.update.success', FAILED: 'category.update.failed' },
      DELETE: { START: 'category.delete.start', SUCCESS: 'category.delete.success', FAILED: 'category.delete.failed' },
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

describe('CategoryHandlers Hookey Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileHooks.emit.mockResolvedValue(undefined);
  });

  describe('create method hookey integration', () => {
    it('should emit START and SUCCESS events for successful create', async () => {
      const createPayload: CreateCategoryPayload = {
        name: 'Fiction',
        description: 'Fiction books category',
        color: '#FF5733'
      };

      const mockCategory: Category = {
        id: 'category-123',
        name: 'Fiction',
        description: 'Fiction books category',
        color: '#FF5733',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockCategory);

      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);
      await categoryHandler.create(createPayload);

      // Verify START event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.CREATE.START,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'category',
          timestamp: expect.any(String),
          metadata: expect.objectContaining({
            name: 'Fiction',
            description: 'Fiction books category',
            color: '#FF5733'
          })
        })
      );

      // Verify SUCCESS event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.CREATE.SUCCESS,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'category',
          result: expect.objectContaining({
            category: mockCategory
          })
        })
      );

      // Verify events were called in correct order
      const calls = mockMobileHooks.emit.mock.calls;
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toBe(MOBILE_EVENTS.CATEGORY.CREATE.START);
      expect(calls[1][0]).toBe(MOBILE_EVENTS.CATEGORY.CREATE.SUCCESS);
    });

    it('should emit FAILED event with validation error type for validation failures', async () => {
      const invalidPayload = { name: '', description: 'Test description' } as CreateCategoryPayload;

      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);

      await expect(categoryHandler.create(invalidPayload)).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.CREATE.FAILED,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('delete method hookey integration', () => {
    it('should emit START and SUCCESS events for successful delete', async () => {
      const categoryId = 'category-123';

      // Mock the underlying gateway to return success
      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.delete.mockResolvedValue(undefined);

      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);
      await categoryHandler.delete(categoryId);

      // Verify START event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.DELETE.START,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'category',
          metadata: expect.objectContaining({
            categoryId: categoryId
          })
        })
      );

      // Verify SUCCESS event was emitted
      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.DELETE.SUCCESS,
        expect.objectContaining({
          operationId: expect.stringMatching(/^op_\d+_[a-z0-9]+$/),
          resourceType: 'category'
        })
      );
    });

    it('should emit FAILED event for invalid category ID', async () => {
      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);

      await expect(categoryHandler.delete('')).rejects.toThrow();

      expect(mockMobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.CATEGORY.DELETE.FAILED,
        expect.objectContaining({
          errorType: 'validation'
        })
      );
    });
  });

  describe('event metadata consistency', () => {
    it('should include consistent operationId across events in same operation', async () => {
      const createPayload: CreateCategoryPayload = {
        name: 'Science Fiction'
      };

      const mockCategory: Category = {
        id: 'category-123',
        name: 'Science Fiction',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockCategory);

      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);
      await categoryHandler.create(createPayload);

      const calls = mockMobileHooks.emit.mock.calls;
      const startCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.CATEGORY.CREATE.START);
      const successCall = calls.find(([eventName]) => eventName === MOBILE_EVENTS.CATEGORY.CREATE.SUCCESS);

      expect((startCall[1] as Record<string, unknown>).operationId).toBeDefined();
      expect((successCall[1] as Record<string, unknown>).operationId).toBe((startCall[1] as Record<string, unknown>).operationId);
    });

    it('should include all required metadata fields in events', async () => {
      const createPayload: CreateCategoryPayload = {
        name: 'Mystery',
        description: 'Mystery novels',
        color: '#9932CC'
      };

      const mockCategory: Category = {
        id: 'category-123',
        name: 'Mystery',
        description: 'Mystery novels',
        color: '#9932CC',
        creationDate: '2024-01-01',
        updateDate: '2024-01-01'
      };

      const mockGateway = (createClientGateway as jest.Mock)();
      mockGateway.create.mockResolvedValue(mockCategory);

      const categoryHandler = CategoryHandlerFactory.createClientGateway(mockHttpClient);
      await categoryHandler.create(createPayload);

      const allCalls = mockMobileHooks.emit.mock.calls;
      
      allCalls.forEach((call) => {
        const metadata = call[1] as Record<string, unknown>;
        expect(metadata.operationId).toBeDefined();
        expect(metadata.resourceType).toBe('category');
        expect(metadata.timestamp).toBeDefined();
        expect(typeof metadata.timestamp).toBe('string');
      });
    });
  });
});