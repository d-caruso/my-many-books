/**
 * Tests for Queue with ID Mapping Integration (Phase 5 - Task 5.3.3)
 *
 * Tests the integration between OperationQueue, QueueExecutor, and IDMappingService
 */

import { operationQueue } from '../../src/services/OperationQueue';
import { executeOperation } from '../../src/services/QueueExecutor';
import { idMappingService } from '../../src/services/sync/IDMappingService';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { bookAPI } from '../../src/services/api';

// Mock the bookAPI
jest.mock('../../src/services/api', () => ({
  bookAPI: {
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
  },
}));

describe('Queue with ID Mapping Integration (Task 5.3.3)', () => {
  beforeAll(async () => {
    // Initialize database
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  beforeEach(async () => {
    // Clear queue, ID mappings, and books
    await operationQueue.clear();
    await idMappingService.clearAll();

    // Clear all books from database
    const db = databaseService.getDatabase();
    await db.runAsync('DELETE FROM books');

    // Reset mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  describe('CREATE operation with ID mapping', () => {
    it('should create book, register ID mapping, and update local DB with server_id', async () => {
      const tempId = 'temp-1703856000000';
      const serverId = 5001;

      // Setup: Create book in local DB with temp ID
      await bookRepository.create({
        id: tempId,
        title: 'Test Book',
        status: 'want-to-read',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Mock API to return server response with server ID
      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'Test Book',
        status: 'want-to-read',
      });

      // Enqueue CREATE operation
      const operation = {
        id: 'op-1',
        type: 'CREATE' as const,
        resource: 'book' as const,
        payload: {
          id: tempId,
          title: 'Test Book',
          status: 'want-to-read',
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: API was called with _tempId field
      expect(bookAPI.createBook).toHaveBeenCalledWith(
        expect.objectContaining({
          _tempId: tempId,
          title: 'Test Book',
        })
      );

      // Verify: ID mapping was registered
      const mappedServerId = await idMappingService.getServerId(tempId);
      expect(mappedServerId).toBe(serverId);

      // Verify: Local DB was updated with server_id
      const localBook = await bookRepository.findById(tempId);
      expect(localBook?.serverId).toBe(serverId);
    });

    it('should resolve foreign keys before sending to server', async () => {
      const tempBookId = 'temp-book-123';
      const tempAuthorId = 'temp-author-456';
      const serverAuthorId = 2002;

      // Setup: Create book in local DB
      await bookRepository.create({
        id: tempBookId,
        title: 'Book with Author Reference',
        status: 'want-to-read',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Register author ID mapping
      await idMappingService.registerTempId(tempAuthorId, serverAuthorId, 'author');

      // Setup: Mock API response
      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: 5002,
        title: 'Book with Author Reference',
      });

      // Enqueue CREATE operation with foreign key reference
      const operation = {
        id: 'op-2',
        type: 'CREATE' as const,
        resource: 'book' as const,
        payload: {
          id: tempBookId,
          title: 'Book with Author Reference',
          authorId: tempAuthorId, // This should be resolved to serverAuthorId
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: Foreign key was resolved in API call
      expect(bookAPI.createBook).toHaveBeenCalledWith(
        expect.objectContaining({
          _tempId: tempBookId,
          authorId: serverAuthorId, // Should be resolved
        })
      );
    });
  });

  describe('UPDATE operation with temp and server IDs', () => {
    it('should use server_id when available', async () => {
      const tempId = 'temp-1703856001000';
      const serverId = 5003;

      // Setup: Create book with server_id
      await bookRepository.create({
        id: tempId,
        title: 'Book with Server ID',
        status: 'reading',
        serverId,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Register ID mapping
      await idMappingService.registerTempId(tempId, serverId, 'book');

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'Updated Title',
      });

      // Enqueue UPDATE operation
      const operation = {
        id: 'op-3',
        type: 'UPDATE' as const,
        resource: 'book' as const,
        payload: {
          id: tempId,
          title: 'Updated Title',
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: API was called with server ID
      expect(bookAPI.updateBook).toHaveBeenCalledWith(
        String(serverId),
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });

    it('should use temp ID when server_id not available', async () => {
      const tempId = 'temp-1703856002000';

      // Setup: Create book WITHOUT server_id (never synced)
      await bookRepository.create({
        id: tempId,
        title: 'Book Without Server ID',
        status: 'reading',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({
        id: tempId,
        title: 'Updated Title',
      });

      // Enqueue UPDATE operation
      const operation = {
        id: 'op-4',
        type: 'UPDATE' as const,
        resource: 'book' as const,
        payload: {
          id: tempId,
          title: 'Updated Title',
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: API was called with temp ID
      expect(bookAPI.updateBook).toHaveBeenCalledWith(
        tempId,
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });

    it('should resolve foreign keys in UPDATE payload', async () => {
      const tempBookId = 'temp-book-789';
      const tempCategoryId = 'temp-category-999';
      const serverCategoryId = 3003;

      // Setup: Create book
      await bookRepository.create({
        id: tempBookId,
        title: 'Book to Update',
        status: 'reading',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Register category ID mapping
      await idMappingService.registerTempId(tempCategoryId, serverCategoryId, 'category');

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({ id: tempBookId });

      // Enqueue UPDATE operation with foreign key
      const operation = {
        id: 'op-5',
        type: 'UPDATE' as const,
        resource: 'book' as const,
        payload: {
          id: tempBookId,
          categoryId: tempCategoryId, // Should be resolved
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: Foreign key was resolved
      expect(bookAPI.updateBook).toHaveBeenCalledWith(
        tempBookId,
        expect.objectContaining({
          categoryId: serverCategoryId,
        })
      );
    });
  });

  describe('DELETE operation with temp and server IDs', () => {
    it('should use server_id for DELETE when available', async () => {
      const tempId = 'temp-1703856003000';
      const serverId = 5004;

      // Setup: Create book with server_id
      await bookRepository.create({
        id: tempId,
        title: 'Book to Delete',
        status: 'completed',
        serverId,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Register ID mapping
      await idMappingService.registerTempId(tempId, serverId, 'book');

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);

      // Enqueue DELETE operation
      const operation = {
        id: 'op-6',
        type: 'DELETE' as const,
        resource: 'book' as const,
        payload: { id: tempId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: API was called with server ID
      expect(bookAPI.deleteBook).toHaveBeenCalledWith(String(serverId));
    });

    it('should skip server DELETE when book never synced (no server_id)', async () => {
      const tempId = 'temp-1703856004000';

      // Setup: Create book WITHOUT server_id (never synced)
      await bookRepository.create({
        id: tempId,
        title: 'Local-only Book',
        status: 'want-to-read',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);

      // Enqueue DELETE operation
      const operation = {
        id: 'op-7',
        type: 'DELETE' as const,
        resource: 'book' as const,
        payload: { id: tempId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation
      await executeOperation(operation);

      // Verify: API was NOT called (book never synced)
      expect(bookAPI.deleteBook).not.toHaveBeenCalled();
    });

    it('should succeed when book already deleted locally', async () => {
      const tempId = 'temp-nonexistent';

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);

      // Enqueue DELETE operation for non-existent book
      const operation = {
        id: 'op-8',
        type: 'DELETE' as const,
        resource: 'book' as const,
        payload: { id: tempId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Execute operation (should not throw)
      await executeOperation(operation);

      // Verify: API was NOT called
      expect(bookAPI.deleteBook).not.toHaveBeenCalled();
    });
  });

  describe('End-to-end sync workflow', () => {
    it('should handle complete CREATE → sync → UPDATE → DELETE workflow', async () => {
      const tempId = 'temp-e2e-1703856000000';
      const serverId = 6001;

      // Step 1: CREATE book with temp ID
      await bookRepository.create({
        id: tempId,
        title: 'E2E Test Book',
        status: 'want-to-read',
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      });

      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'E2E Test Book',
      });

      const createOp = {
        id: 'op-create',
        type: 'CREATE' as const,
        resource: 'book' as const,
        payload: { id: tempId, title: 'E2E Test Book' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await executeOperation(createOp);

      // Verify: ID mapping registered
      expect(await idMappingService.getServerId(tempId)).toBe(serverId);

      // Step 2: UPDATE book (should use server_id)
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'Updated E2E Book',
      });

      const updateOp = {
        id: 'op-update',
        type: 'UPDATE' as const,
        resource: 'book' as const,
        payload: { id: tempId, title: 'Updated E2E Book' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await executeOperation(updateOp);

      // Verify: UPDATE used server_id
      expect(bookAPI.updateBook).toHaveBeenCalledWith(
        String(serverId),
        expect.any(Object)
      );

      // Step 3: DELETE book (should use server_id)
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);

      const deleteOp = {
        id: 'op-delete',
        type: 'DELETE' as const,
        resource: 'book' as const,
        payload: { id: tempId },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await executeOperation(deleteOp);

      // Verify: DELETE used server_id
      expect(bookAPI.deleteBook).toHaveBeenCalledWith(String(serverId));
    });
  });
});
