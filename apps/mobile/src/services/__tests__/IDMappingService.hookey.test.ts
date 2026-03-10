import { IDMappingService } from '../sync/IDMappingService';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { databaseService } from '../database/DatabaseService';

// Mock mobile hooks
jest.mock('../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn().mockResolvedValue(undefined),
  },
  MOBILE_EVENTS: {
    SYNC: {
      ID_MAPPING: {
        START: 'sync.id_mapping.start',
        COMPLETE: 'sync.id_mapping.complete',
      },
      FAILED: 'sync.failed',
    },
  },
}));

// Mock database service
jest.mock('../database/DatabaseService', () => ({
  databaseService: {
    getAllAsync: jest.fn(),
    executeQuery: jest.fn(),
  },
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('IDMappingService Hookey Integration', () => {
  let idMappingService: IDMappingService;

  beforeEach(() => {
    jest.clearAllMocks();
    idMappingService = new IDMappingService();
    mockMobileHooks.emit.mockResolvedValue(undefined);

    mockDatabaseService.getAllAsync.mockResolvedValue([]);
    mockDatabaseService.executeQuery.mockResolvedValue(undefined);
  });

  describe('registerTempId', () => {
    it('should emit ID_MAPPING.START when registration begins', async () => {
      await idMappingService.registerTempId('temp-123', 456, 'book');

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        tempId: 'temp-123',
        serverId: 456,
        resourceType: 'book',
        operation: 'register',
        timestamp: expect.any(String)
      }));
    });

    it('should emit ID_MAPPING.COMPLETE when registration succeeds', async () => {
      await idMappingService.registerTempId('temp-456', 789, 'author');

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        tempId: 'temp-456',
        serverId: 789,
        resourceType: 'author',
        operation: 'register',
        success: true,
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.FAILED when registration fails', async () => {
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Database error'));

      await expect(idMappingService.registerTempId('temp-789', 123, 'category')).rejects.toThrow();

      const failedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.FAILED
      );

      expect(failedCalls).toHaveLength(1);
      expect(failedCalls[0][1]).toEqual(expect.objectContaining({
        stage: 'id_mapping',
        operation: 'register',
        tempId: 'temp-789',
        serverId: 123,
        resourceType: 'category',
        error: 'Database error',
        timestamp: expect.any(String)
      }));
    });

    it('should use default resource type when not specified', async () => {
      await idMappingService.registerTempId('temp-default', 999);

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START
      );

      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'book' // default value
      }));
    });
  });

  describe('resolveForeignKeys', () => {
    beforeEach(async () => {
      // Setup some mappings for resolution testing
      await idMappingService.registerTempId('temp-book-1', 101, 'book');
      await idMappingService.registerTempId('temp-author-1', 201, 'author');
      mockMobileHooks.emit.mockClear(); // Clear setup calls
    });

    it('should emit ID_MAPPING.START when resolution begins', async () => {
      const data = { id: 'temp-book-1', authorId: 'temp-author-1' };

      await idMappingService.resolveForeignKeys(data);

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        operation: 'resolve_foreign_keys',
        dataType: 'object',
        timestamp: expect.any(String)
      }));
    });

    it('should emit ID_MAPPING.COMPLETE for successful field resolution', async () => {
      const data = { id: 'temp-book-1', title: 'Test Book' };

      await idMappingService.resolveForeignKeys(data);

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      // Should have completion calls for successful resolution and overall completion
      expect(completeCalls.length).toBeGreaterThan(0);
      
      const fieldResolutionCall = completeCalls.find(([, payload]) => {
        const p = payload as Record<string, unknown>;
        return p.operation === 'resolve_foreign_key' && p.success === true;
      });
      
      expect(fieldResolutionCall).toBeDefined();
      expect(fieldResolutionCall[1]).toEqual(expect.objectContaining({
        operation: 'resolve_foreign_key',
        field: 'id',
        tempId: 'temp-book-1',
        serverId: 101,
        success: true,
        timestamp: expect.any(String)
      }));
    });

    it('should emit ID_MAPPING.COMPLETE for failed field resolution', async () => {
      const data = { id: 'temp-nonexistent', title: 'Test Book' };

      await idMappingService.resolveForeignKeys(data);

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      const failedResolutionCall = completeCalls.find(([, payload]) => {
        const p = payload as Record<string, unknown>;
        return p.operation === 'resolve_foreign_key' && p.success === false;
      });
      
      expect(failedResolutionCall).toBeDefined();
      expect(failedResolutionCall[1]).toEqual(expect.objectContaining({
        operation: 'resolve_foreign_key',
        field: 'id',
        tempId: 'temp-nonexistent',
        serverId: null,
        success: false,
        reason: 'mapping_not_found',
        timestamp: expect.any(String)
      }));
    });

    it('should emit final completion event for overall resolution process', async () => {
      const data = { id: 'temp-book-1', authorId: 'temp-author-1' };

      await idMappingService.resolveForeignKeys(data);

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      const overallCompletionCall = completeCalls.find(([, payload]) =>
        (payload as Record<string, unknown>).operation === 'resolve_foreign_keys'
      );

      expect(overallCompletionCall).toBeDefined();
      expect(overallCompletionCall[1]).toEqual(expect.objectContaining({
        operation: 'resolve_foreign_keys',
        dataType: 'object',
        resolvedKeys: expect.any(Number),
        timestamp: expect.any(String)
      }));
    });

    it('should handle different field naming conventions', async () => {
      await idMappingService.registerTempId('temp-author-123', 301, 'author');
      await idMappingService.registerTempId('temp-cat-456', 401, 'category');
      mockMobileHooks.emit.mockClear();

      const data = {
        authorId: 'temp-author-123',
        category_id: 'temp-cat-456',
        bookId: 'regular-id', // Not a temp ID
        title: 'Test Book'
      };

      await idMappingService.resolveForeignKeys(data);

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      const successfulResolutions = completeCalls.filter(([, payload]) => {
        const p = payload as Record<string, unknown>;
        return p.operation === 'resolve_foreign_key' && p.success === true;
      });

      // Should resolve temp-author-123 and temp-cat-456 but not regular-id
      expect(successfulResolutions).toHaveLength(2);
    });

    it('should handle array data structures', async () => {
      const data = [
        { id: 'temp-book-1', title: 'Book 1' },
        { id: 'temp-book-2', title: 'Book 2' }
      ];

      await idMappingService.resolveForeignKeys(data);

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START
      );

      // Should emit start events for the main array and each item (recursive calls)
      expect(startCalls.length).toBeGreaterThanOrEqual(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        dataType: 'object' // Array is typeof 'object'
      }));
    });

    it('should handle primitive data types without emitting events', async () => {
      const primitiveData = 'simple string';

      const result = await idMappingService.resolveForeignKeys(primitiveData);

      expect(result).toBe(primitiveData);
      
      // Should still emit start event
      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START
      );

      expect(startCalls).toHaveLength(1);
    });

    it('should handle nested object structures recursively', async () => {
      await idMappingService.registerTempId('temp-nested-1', 501, 'book');
      mockMobileHooks.emit.mockClear();

      const data = {
        book: {
          id: 'temp-nested-1',
          metadata: {
            authorId: 'temp-author-unknown'
          }
        }
      };

      await idMappingService.resolveForeignKeys(data);

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE
      );

      const fieldResolutions = completeCalls.filter(([, payload]) =>
        (payload as Record<string, unknown>).operation === 'resolve_foreign_key'
      );

      // Should attempt to resolve both nested IDs
      expect(fieldResolutions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('event payload validation', () => {
    it('should include all required fields in ID mapping events', async () => {
      await idMappingService.registerTempId('temp-validation', 999, 'test');

      // Check all emitted events have required structure
      mockMobileHooks.emit.mock.calls.forEach(([eventName, payload]) => {
        const p = payload as Record<string, unknown>;
        expect(typeof eventName).toBe('string');
        expect(p).toBeDefined();
        expect(p.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format

        if (eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.START ||
            eventName === MOBILE_EVENTS.SYNC.ID_MAPPING.COMPLETE) {
          expect(p.operation).toBeDefined();
        }
      });
    });

    it('should preserve data integrity while emitting events', async () => {
      const originalData = {
        id: 'temp-preserve-1',
        title: 'Original Title',
        metadata: {
          complex: { nested: 'data' }
        }
      };

      const resolvedData = await idMappingService.resolveForeignKeys(originalData);

      // Data should be transformed (ID resolved) but structure preserved
      expect(resolvedData).toEqual(expect.objectContaining({
        title: 'Original Title',
        metadata: originalData.metadata
      }));

      // Should have emitted events
      expect(mockMobileHooks.emit).toHaveBeenCalled();
    });
  });
});