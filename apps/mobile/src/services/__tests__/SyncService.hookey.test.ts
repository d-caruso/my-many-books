import { SyncService } from '../sync/SyncService';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

// Mock all external dependencies
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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock API services
jest.mock('../api', () => ({
  bookAPI: {
    getBooks: jest.fn(),
  },
  authorAPI: {
    getAuthors: jest.fn(),
  },
  categoryAPI: {
    getCategories: jest.fn(),
  },
}));

// Mock repositories
jest.mock('../database/BookRepository', () => ({
  bookRepository: {
    findByServerId: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../database/AuthorRepository', () => ({
  authorRepository: {
    findByServerId: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    updateSyncFields: jest.fn(),
  },
}));

jest.mock('../database/CategoryRepository', () => ({
  categoryRepository: {
    findByServerId: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    updateSyncFields: jest.fn(),
  },
}));

// Mock other services
jest.mock('../sync/IDMappingService', () => ({
  idMappingService: {
    registerTempId: jest.fn(),
  },
}));

jest.mock('../OperationQueue', () => ({
  operationQueue: {
    getPendingOperations: jest.fn().mockReturnValue([]),
    size: jest.fn().mockReturnValue(0),
    processQueue: jest.fn(),
  },
}));

jest.mock('../QueueExecutor', () => ({
  executeOperation: jest.fn(),
}));

jest.mock('../../utils/conflictDetection', () => ({
  hasBookConflict: jest.fn(),
  hasAuthorConflict: jest.fn(),
  hasCategoryConflict: jest.fn(),
}));

jest.mock('../sync/CleanupService', () => ({
  cleanupService: {
    performFullCleanup: jest.fn().mockResolvedValue({
      deletedBooks: 0,
      deletedMappings: 0,
      deletedOperations: 0,
    }),
  },
}));

const mockMobileHooks = mobileHooks as jest.Mocked<typeof mobileHooks>;

describe('SyncService Hookey Integration', () => {
  let syncService: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    syncService = new SyncService();
    mockMobileHooks.emit.mockResolvedValue(undefined);
  });

  describe('performSync', () => {
    it('should emit SYNC.START when sync begins', async () => {
      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);
      
      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.START
      );

      expect(startCalls).toHaveLength(1);
      expect(startCalls[0][1]).toEqual(expect.objectContaining({
        sessionId: expect.stringMatching(/^sync-session-\d+$/),
        syncType: 'bidirectional',
        lastSyncTime: null, // AsyncStorage.getItem returns null when mocked
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.UPLOAD.START and UPLOAD.COMPLETE during push phase', async () => {
      const { operationQueue } = require('../OperationQueue');
      const mockOps = [
        { id: 'op1', type: 'create', resource: 'book' },
        { id: 'op2', type: 'update', resource: 'book' }
      ];
      operationQueue.getPendingOperations.mockReturnValue(mockOps);
      operationQueue.processQueue.mockResolvedValue(undefined);

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const uploadStartCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.UPLOAD.START
      );
      const uploadCompleteCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.UPLOAD.COMPLETE
      );

      expect(uploadStartCalls).toHaveLength(1);
      expect(uploadStartCalls[0][1]).toEqual(expect.objectContaining({
        pendingOperations: 2,
        queueSize: 0,
        timestamp: expect.any(String)
      }));

      expect(uploadCompleteCalls).toHaveLength(1);
      expect(uploadCompleteCalls[0][1]).toEqual(expect.objectContaining({
        uploadedOperations: 2,
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.DOWNLOAD.START and entity SYNC.PULL events during pull phase', async () => {
      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ 
        books: [
          { id: 1, title: 'Test Book', status: 'reading' }
        ] 
      });
      authorAPI.getAuthors.mockResolvedValue([
        { id: 1, name: 'Test Author' }
      ]);
      categoryAPI.getCategories.mockResolvedValue([
        { id: 1, name: 'Test Category' }
      ]);

      const { bookRepository } = require('../database/BookRepository');
      bookRepository.findByServerId.mockResolvedValue(null);
      
      const { authorRepository } = require('../database/AuthorRepository');
      authorRepository.findByServerId.mockResolvedValue(null);
      authorRepository.findByName.mockResolvedValue(null);
      authorRepository.create.mockResolvedValue({ id: 'author-1' });
      
      const { categoryRepository } = require('../database/CategoryRepository');
      categoryRepository.findByServerId.mockResolvedValue(null);
      categoryRepository.findByName.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue({ id: 'category-1' });

      await syncService.performSync();

      const downloadStartCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.DOWNLOAD.START
      );
      const authorPullStartCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.SYNC.PULL.START
      );
      const categoryPullStartCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.CATEGORY.SYNC.PULL.START
      );

      expect(downloadStartCalls).toHaveLength(1);
      expect(downloadStartCalls[0][1]).toEqual(expect.objectContaining({
        downloadType: 'incremental',
        timestamp: expect.any(String)
      }));

      expect(authorPullStartCalls).toHaveLength(1);
      expect(categoryPullStartCalls).toHaveLength(1);
    });

    it('should emit SYNC.COMPLETE when sync succeeds', async () => {
      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const completeCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.COMPLETE
      );

      expect(completeCalls).toHaveLength(1);
      expect(completeCalls[0][1]).toEqual(expect.objectContaining({
        syncType: 'bidirectional',
        pulledCount: 0,
        pushedCount: 0,
        duration: expect.any(Number),
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.FAILED when sync encounters errors', async () => {
      const { operationQueue } = require('../OperationQueue');
      // Mock some operations to trigger upload phase
      operationQueue.getPendingOperations.mockReturnValue([{ id: 'test-op', type: 'create' }]);
      operationQueue.processQueue.mockRejectedValue(new Error('Queue processing failed'));

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const failedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.FAILED
      );

      expect(failedCalls.length).toBeGreaterThanOrEqual(1); // At least upload failed
      
      const uploadFailedCall = failedCalls.find(([, payload]) => (payload as Record<string, unknown>).stage === 'upload');
      expect(uploadFailedCall).toBeDefined();
      expect(uploadFailedCall[1]).toEqual(expect.objectContaining({
        stage: 'upload',
        error: 'Queue processing failed',
        timestamp: expect.any(String)
      }));
    });

    it('should not start sync if already in progress', async () => {
      // Start first sync
      const firstSyncPromise = syncService.performSync();
      
      // Try to start second sync while first is running
      const secondSyncResult = await syncService.performSync();
      
      // Wait for first sync to complete
      await firstSyncPromise;

      expect(secondSyncResult).toEqual({ pulled: 0, pushed: 0, errors: 0 });

      // Should only emit one SYNC.START event
      const startCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.START
      );
      expect(startCalls).toHaveLength(1);
    });
  });

  describe('conflict detection', () => {
    it('should emit SYNC.CONFLICT.DETECTED for book conflicts', async () => {
      const { hasBookConflict } = require('../../utils/conflictDetection');
      const { bookRepository } = require('../database/BookRepository');
      
      hasBookConflict.mockReturnValue(true);
      bookRepository.findByServerId.mockResolvedValue({
        entity: { id: 'local-book-1', title: 'Local Title', updateDate: '2024-01-01T00:00:00Z' },
        syncStatus: 'synced',
      });

      const { bookAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({
        books: [{
          id: 1,
          title: 'Server Title',
          status: 'reading',
          updateDate: '2024-01-02T00:00:00Z'
        }]
      });

      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { authorAPI, categoryAPI } = require('../api');
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const conflictCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.BOOK.SYNC.CONFLICT.DETECTED
      );

      expect(conflictCalls).toHaveLength(1);
      expect(conflictCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'book',
        resourceId: 'local-book-1',
        serverId: 1,
        conflictType: 'data_mismatch',
        localData: expect.any(Object),
        serverData: expect.any(Object),
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.CONFLICT.DETECTED for author conflicts', async () => {
      const { hasAuthorConflict } = require('../../utils/conflictDetection');
      const { authorRepository } = require('../database/AuthorRepository');
      
      hasAuthorConflict.mockReturnValue(true);
      authorRepository.findByServerId.mockResolvedValue({
        entity: { id: 'local-author-1', name: 'Local Author' },
        serverUpdatedAt: undefined,
      });

      const { authorAPI } = require('../api');
      authorAPI.getAuthors.mockResolvedValue([{
        id: 1,
        name: 'Server Author',
        updateDate: '2024-01-01T00:00:00Z'
      }]);

      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const conflictCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.AUTHOR.SYNC.CONFLICT.DETECTED
      );

      expect(conflictCalls).toHaveLength(1);
      expect(conflictCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'author',
        resourceId: 'local-author-1',
        serverId: 1,
        conflictType: 'data_mismatch',
        timestamp: expect.any(String)
      }));
    });

    it('should emit SYNC.CONFLICT.DETECTED for category conflicts', async () => {
      const { hasCategoryConflict } = require('../../utils/conflictDetection');
      const { categoryRepository } = require('../database/CategoryRepository');
      
      hasCategoryConflict.mockReturnValue(true);
      categoryRepository.findByServerId.mockResolvedValue({
        entity: { id: 'local-category-1', name: 'Local Category' },
        serverUpdatedAt: undefined,
      });

      const { categoryAPI } = require('../api');
      categoryAPI.getCategories.mockResolvedValue([{
        id: 1,
        name: 'Server Category',
        updateDate: '2024-01-01T00:00:00Z'
      }]);

      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, authorAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);

      await syncService.performSync();

      const conflictCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.CATEGORY.SYNC.CONFLICT.DETECTED
      );

      expect(conflictCalls).toHaveLength(1);
      expect(conflictCalls[0][1]).toEqual(expect.objectContaining({
        resourceType: 'category',
        resourceId: 'local-category-1',
        serverId: 1,
        conflictType: 'data_mismatch',
        timestamp: expect.any(String)
      }));
    });
  });

  describe('incremental sync', () => {
    it('should pass lastSyncTime to API calls for incremental sync', async () => {
      const mockLastSyncTime = '2024-01-01T00:00:00Z';
      jest.spyOn(syncService, 'getLastSyncTime').mockResolvedValue(mockLastSyncTime);

      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({ books: [] });
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performIncrementalSync();

      expect(bookAPI.getBooks).toHaveBeenCalledWith(
        1, // page
        50, // SYNC_PAGE_SIZE
        true, // includeAuthors
        true, // includeCategories
        mockLastSyncTime // updatedSince
      );

      expect(authorAPI.getAuthors).toHaveBeenCalledWith(mockLastSyncTime);
      expect(categoryAPI.getCategories).toHaveBeenCalledWith(mockLastSyncTime);
    });
  });

  describe('error scenarios', () => {
    it('should emit SYNC.FAILED when API calls fail', async () => {
      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI } = require('../api');
      bookAPI.getBooks.mockRejectedValue(new Error('API Error'));

      const { authorAPI, categoryAPI } = require('../api');
      authorAPI.getAuthors.mockResolvedValue([]);
      categoryAPI.getCategories.mockResolvedValue([]);

      await syncService.performSync();

      const failedCalls = mockMobileHooks.emit.mock.calls.filter(
        ([eventName]) => eventName === MOBILE_EVENTS.SYNC.FAILED
      );

      expect(failedCalls.length).toBeGreaterThan(0);
      expect(failedCalls.some(([, payload]) => {
        const p = payload as Record<string, unknown>;
        return p.stage === 'download' && p.error === 'API Error';
      })).toBe(true);
    });

    it('should handle empty API responses gracefully', async () => {
      const { operationQueue } = require('../OperationQueue');
      operationQueue.getPendingOperations.mockReturnValue([]);

      const { bookAPI, authorAPI, categoryAPI } = require('../api');
      bookAPI.getBooks.mockResolvedValue({}); // Empty response
      authorAPI.getAuthors.mockResolvedValue(null); // Null response
      categoryAPI.getCategories.mockResolvedValue(undefined); // Undefined response

      await expect(syncService.performSync()).resolves.not.toThrow();
    });
  });
});