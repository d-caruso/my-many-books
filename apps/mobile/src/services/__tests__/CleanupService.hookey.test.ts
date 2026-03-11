import { CleanupService } from '../sync/CleanupService';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';
import { databaseService } from '../database/DatabaseService';
import { operationQueue } from '../OperationQueue';
import { idMappingService } from '../sync/IDMappingService';

// Mock mobile hooks
jest.mock('../hooks/mobileHooks', () => {
  // Import the actual event tree and build function
  const actualMobileHooks = jest.requireActual('../hooks/mobileHooks');
  
  return {
    mobileHooks: {
      emit: jest.fn().mockResolvedValue(undefined),
    },
    // Use the actual event tree instead of hard-coded strings
    MOBILE_EVENTS: actualMobileHooks.MOBILE_EVENTS,
  };
});

// Mock database service
jest.mock('../database/DatabaseService', () => ({
  databaseService: {
    getAllAsync: jest.fn(),
    executeQuery: jest.fn(),
    getFirstAsync: jest.fn(),
    getDatabase: jest.fn().mockReturnValue({
      runAsync: jest.fn(),
    }),
  },
}));

// Mock operation queue
jest.mock('../OperationQueue', () => ({
  operationQueue: {
    getFailedOperations: jest.fn(),
    getPendingOperations: jest.fn(),
    dequeue: jest.fn(),
    getAllOperations: jest.fn(),
  },
}));

// Mock ID mapping service
jest.mock('../sync/IDMappingService', () => ({
  idMappingService: {
    getAllMappings: jest.fn(),
  },
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockOperationQueue = operationQueue as jest.Mocked<typeof operationQueue>;
const mockIdMappingService = idMappingService as jest.Mocked<typeof idMappingService>;

describe('CleanupService Hookey Integration', () => {
  let cleanupService: CleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupService = new CleanupService();
    mockMobileHooks.emit.mockResolvedValue(undefined);

    mockDatabaseService.getAllAsync.mockResolvedValue([]);
    mockDatabaseService.executeQuery.mockResolvedValue(undefined);
    mockDatabaseService.getFirstAsync.mockResolvedValue(null);

    const db = mockDatabaseService.getDatabase();
    db.runAsync.mockResolvedValue(undefined);

    mockOperationQueue.getFailedOperations.mockReturnValue([]);
    mockOperationQueue.getPendingOperations.mockReturnValue([]);
    mockOperationQueue.getAllOperations.mockReturnValue([]);
    mockOperationQueue.dequeue.mockResolvedValue(undefined);

    mockIdMappingService.getAllMappings.mockResolvedValue([]);
  });

  describe('performFullCleanup', () => {
    it('should emit SYNC.START when cleanup begins', async () => {
      await cleanupService.performFullCleanup();

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.START
      );

      expect(startCalls).toHaveLength(3); // full_cleanup + orphaned_temp_ids + inconsistent_states
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        sessionId: expect.stringMatching(/^cleanup-\d+$/),
        operation: 'cleanup',
        stage: 'full_cleanup',
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.COMPLETE when cleanup succeeds', async () => {
      const mockResults = {
        deletedBooks: 2,
        deletedMappings: 1,
        deletedOperations: 3
      };

      // Mock cleanup methods to return specific results
      jest.spyOn(cleanupService, 'cleanupOrphanedTempIds').mockResolvedValue(mockResults);

      await cleanupService.performFullCleanup();

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE
      );

      expect(completeCalls.length).toBeGreaterThan(0);
      
      const fullCleanupComplete = completeCalls.find(([, payload]) =>
        (payload as Record<string, unknown>).stage === 'full_cleanup'
      );

      expect(fullCleanupComplete).toBeDefined();
      expect(fullCleanupComplete[1]).toEqual(expect.objectContaining({
        operation: 'cleanup',
        stage: 'full_cleanup',
        results: mockResults,
        timestamp: expect.any(String)
      }));
    });

    it('should emit events for each cleanup stage', async () => {
      await cleanupService.performFullCleanup();

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.START
      );

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE
      );

      // Should have start/complete events for:
      // 1. Full cleanup
      // 2. Orphaned temp IDs
      // 3. Inconsistent sync states
      expect(startCalls.length).toBeGreaterThanOrEqual(3);
      expect(completeCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('cleanupOrphanedTempIds', () => {
    it('should emit SYNC.START for orphaned data cleanup', async () => {
      await cleanupService.cleanupOrphanedTempIds();

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName, payload]) => eventName === MOBILE_EVENTS.SYNC.START &&
        (payload as Record<string, unknown>).operation === 'cleanup_orphaned'
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        operation: 'cleanup_orphaned',
        stage: 'orphaned_temp_ids',
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.COMPLETE with cleanup results', async () => {
      const mockFailedOps = [
        { id: 'old-op-1', timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) }, // 8 days old
        { id: 'old-op-2', timestamp: Date.now() - (10 * 24 * 60 * 60 * 1000) }, // 10 days old
      ];
      
      mockOperationQueue.getFailedOperations.mockReturnValue(mockFailedOps);
      mockDatabaseService.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await cleanupService.cleanupOrphanedTempIds();

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName, payload]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE &&
        (payload as Record<string, unknown>).operation === 'cleanup_orphaned'
      );

      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        operation: 'cleanup_orphaned',
        stage: 'orphaned_temp_ids',
        results: expect.objectContaining({
          deletedBooks: expect.any(Number),
          deletedMappings: expect.any(Number),
          deletedOperations: expect.any(Number)
        }),
        timestamp: expect.any(String)
      }));
    });

    it('should clean up old operations based on age', async () => {
      const oldOperation = {
        id: 'very-old-op', 
        timestamp: Date.now() - (10 * 24 * 60 * 60 * 1000) // 10 days old
      };
      const recentOperation = {
        id: 'recent-op',
        timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000)
      };

      mockOperationQueue.getFailedOperations.mockReturnValue([oldOperation, recentOperation]);

      await cleanupService.cleanupOrphanedTempIds();

      // Should only remove the old operation
      expect(mockOperationQueue.dequeue).toHaveBeenCalledWith('very-old-op');
      expect(mockOperationQueue.dequeue).not.toHaveBeenCalledWith('recent-op');
    });
  });

  describe('fixInconsistentSyncStates', () => {
    it('should emit SYNC.START for sync state fixes', async () => {
      await cleanupService.fixInconsistentSyncStates();

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName, payload]) => eventName === MOBILE_EVENTS.SYNC.START &&
        (payload as Record<string, unknown>).operation === 'fix_sync_states'
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        operation: 'fix_sync_states',
        stage: 'inconsistent_states',
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.COMPLETE after fixing sync states', async () => {
      await cleanupService.fixInconsistentSyncStates();

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName, payload]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE &&
        (payload as Record<string, unknown>).operation === 'fix_sync_states'
      );

      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        operation: 'fix_sync_states',
        stage: 'inconsistent_states',
        timestamp: expect.any(String)
      }));
    });

    it('should emit VALIDATION_FAILED for books pending without operations', async () => {
      const pendingBooks = [
        { id: 'book-1', title: 'Test Book', sync_status: 'pending' }
      ];
      
      mockDatabaseService.getAllAsync
        .mockResolvedValueOnce(pendingBooks)
        .mockResolvedValueOnce([]);

      mockOperationQueue.getAllOperations.mockReturnValue([]);

      await cleanupService.fixInconsistentSyncStates();

      const validationFailedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.VALIDATION_FAILED
      );

      expect(validationFailedCalls).toHaveLength(1);
      expect(validationFailedCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'book',
        resourceId: 'book-1',
        validationType: 'sync_state_consistency',
        issue: 'pending_without_operation',
        action: 'marked_as_failed',
        timestamp: expect.any(String)
      }));
    });

    it('should emit VALIDATION_FAILED for failed books with server IDs', async () => {
      
      const failedBooks = [
        { 
          id: 'book-2', 
          server_id: 123, 
          sync_status: 'failed',
          creation_date: new Date().toISOString()
        }
      ];
      
      mockDatabaseService.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(failedBooks);

      await cleanupService.fixInconsistentSyncStates();

      const validationFailedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.VALIDATION_FAILED
      );

      expect(validationFailedCalls).toHaveLength(1);
      expect(validationFailedCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'book',
        resourceId: 'book-2',
        serverId: 123,
        validationType: 'sync_status_correction',
        issue: 'failed_with_server_id',
        action: 'corrected_to_synced',
        timestamp: expect.any(String)
      }));
    });

    it('should emit VALIDATION_FAILED for recent failures marked for retry', async () => {
      
      const recentFailedBooks = [
        { 
          id: 'book-3', 
          server_id: null, 
          sync_status: 'failed',
          creation_date: new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString() // 6 hours ago
        }
      ];
      
      mockDatabaseService.getAllAsync
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(recentFailedBooks);

      await cleanupService.fixInconsistentSyncStates();

      const validationFailedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.VALIDATION_FAILED
      );

      expect(validationFailedCalls).toHaveLength(1);
      expect(validationFailedCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'book',
        resourceId: 'book-3',
        validationType: 'retry_eligibility',
        issue: 'recent_failure',
        action: 'reset_to_pending',
        ageInDays: 0, // Less than 1 day
        timestamp: expect.any(String)
      }));
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully during cleanup', async () => {
      mockDatabaseService.executeQuery.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw
      await expect(cleanupService.performFullCleanup()).resolves.toBeDefined();
    });

    it('should continue cleanup even if some stages fail', async () => {
      jest.spyOn(cleanupService, 'cleanupOrphanedTempIds')
        .mockRejectedValue(new Error('Cleanup failed'));

      const result = await cleanupService.performFullCleanup();

      // Should still complete with default values
      expect(result).toEqual(expect.objectContaining({
        deletedBooks: expect.any(Number),
        deletedMappings: expect.any(Number),
        deletedOperations: expect.any(Number)
      }));

      // Should still emit completion event
      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE
      );

      expect(completeCalls.length).toBeGreaterThan(0);
    });
  });

  describe('event payload validation', () => {
    it('should include proper session IDs and timestamps', async () => {
      await cleanupService.performFullCleanup();

      mockMobileHooks.emit.mock.calls.forEach(([eventName, payload]) => {
        const p = payload as Record<string, unknown>;
        expect(typeof eventName).toBe('string');
        expect(p).toBeDefined();
        expect(p.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        if (p.sessionId) {
          expect(p.sessionId).toMatch(/^cleanup-\d+$/);
        }
      });
    });

    it('should emit events in correct order', async () => {
      await cleanupService.performFullCleanup();

      const eventOrder = mockMobileHooks.emit.mock.calls.map(([eventName, payload]) => {
        const p = payload as Record<string, unknown>;
        return {
          event: eventName,
          stage: p.stage,
          operation: p.operation
        };
      });

      // Should start with full cleanup, then proceed to substages
      const fullCleanupStartIndex = eventOrder.findIndex(e => 
        e.event === MOBILE_EVENTS.SYNC.START && e.stage === 'full_cleanup'
      );
      
      const fullCleanupEndIndex = eventOrder.findIndex(e => 
        e.event === MOBILE_EVENTS.SYNC.COMPLETE && e.stage === 'full_cleanup'
      );

      expect(fullCleanupStartIndex).toBeLessThan(fullCleanupEndIndex);
      expect(fullCleanupStartIndex).toBe(0); // Should be first event
    });
  });
});
