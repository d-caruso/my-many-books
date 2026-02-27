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
import { bookAPI, apiClient } from '../../src/services/api';
import { LocalBook } from '../../src/entities/LocalBook';
import { SYNC_STATUS } from '../../src/types';
import type { Book } from '../../src/types';

// Mock the bookAPI and apiClient
jest.mock('../../src/services/api', () => ({
  bookAPI: {
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
  },
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
      const createBook1 = new LocalBook({ title: 'Test Book', status: 'want-to-read', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook1.tempId = tempId;
      await bookRepository.create(createBook1);

      // Setup: Mock API to return server response with server ID
      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'Test Book',
        status: 'want-to-read',
      });
      
      // Also mock apiClient.books.createBook since QueueExecutor uses this
      (apiClient.books.createBook as jest.Mock).mockResolvedValue({
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
      expect(apiClient.books.createBook).toHaveBeenCalledWith(
        expect.objectContaining({
          _tempId: tempId,
          title: 'Test Book',
        })
      );

      // Verify: ID mapping was registered
      const mappedServerId = await idMappingService.getServerId(tempId);
      expect(mappedServerId).toBe(serverId);

      // Verify: Local DB - temp ID replaced with server ID (Critical Fix)
      const localBook = await bookRepository.findById(serverId.toString());
      expect(String(localBook?.entity.id)).toBe(serverId.toString());
      expect(localBook?.serverId).toBe(serverId);
      expect(localBook?.syncStatus).toBe(SYNC_STATUS.SYNCED);
    });

    it('should resolve foreign keys before sending to server', async () => {
      const tempBookId = 'temp-book-123';
      const tempAuthorId = 'temp-author-456';
      const serverAuthorId = 2002;

      // Setup: Create book in local DB
      const createBook2 = new LocalBook({ title: 'Book with Author Reference', status: 'want-to-read', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook2.tempId = tempBookId;
      await bookRepository.create(createBook2);

      // Setup: Register author ID mapping
      await idMappingService.registerTempId(tempAuthorId, serverAuthorId, 'author');

      // Setup: Mock API response
      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: 5002,
        title: 'Book with Author Reference',
      });
      
      (apiClient.books.createBook as jest.Mock).mockResolvedValue({
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
      expect(apiClient.books.createBook).toHaveBeenCalledWith(
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
      const createBook3 = new LocalBook({ title: 'Book with Server ID', status: 'reading', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook3.tempId = tempId;
      createBook3.serverId = serverId;
      await bookRepository.create(createBook3);

      // Setup: Register ID mapping
      await idMappingService.registerTempId(tempId, serverId, 'book');

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'Updated Title',
      });
      
      (apiClient.books.updateBook as jest.Mock).mockResolvedValue({
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
      expect(apiClient.books.updateBook).toHaveBeenCalledWith(
        String(serverId),
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });

    it('should use temp ID when server_id not available', async () => {
      const tempId = 'temp-1703856002000';

      // Setup: Create book WITHOUT server_id (never synced)
      const createBook4 = new LocalBook({ title: 'Book Without Server ID', status: 'reading', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook4.tempId = tempId;
      await bookRepository.create(createBook4);

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({
        id: tempId,
        title: 'Updated Title',
      });
      
      (apiClient.books.updateBook as jest.Mock).mockResolvedValue({
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
      expect(apiClient.books.updateBook).toHaveBeenCalledWith(
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
      const createBook5 = new LocalBook({ title: 'Book to Update', status: 'reading', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook5.tempId = tempBookId;
      await bookRepository.create(createBook5);

      // Setup: Register category ID mapping
      await idMappingService.registerTempId(tempCategoryId, serverCategoryId, 'category');

      // Setup: Mock API
      (bookAPI.updateBook as jest.Mock).mockResolvedValue({ id: tempBookId });
      
      (apiClient.books.updateBook as jest.Mock).mockResolvedValue({ id: tempBookId });

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
      expect(apiClient.books.updateBook).toHaveBeenCalledWith(
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
      const createBook6 = new LocalBook({ title: 'Book to Delete', status: 'completed', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook6.tempId = tempId;
      createBook6.serverId = serverId;
      await bookRepository.create(createBook6);

      // Setup: Register ID mapping
      await idMappingService.registerTempId(tempId, serverId, 'book');

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);
      
      (apiClient.books.deleteBook as jest.Mock).mockResolvedValue(undefined);

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
      expect(apiClient.books.deleteBook).toHaveBeenCalledWith(String(serverId));
    });

    it('should skip server DELETE when book never synced (no server_id)', async () => {
      const tempId = 'temp-1703856004000';

      // Setup: Create book WITHOUT server_id (never synced)
      const createBook7 = new LocalBook({ title: 'Local-only Book', status: 'want-to-read', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      createBook7.tempId = tempId;
      await bookRepository.create(createBook7);

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);
      
      (apiClient.books.deleteBook as jest.Mock).mockResolvedValue(undefined);

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
      expect(apiClient.books.deleteBook).not.toHaveBeenCalled();
    });

    it('should succeed when book already deleted locally', async () => {
      const tempId = 'temp-nonexistent';

      // Setup: Mock API
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);
      
      (apiClient.books.deleteBook as jest.Mock).mockResolvedValue(undefined);

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
      expect(apiClient.books.deleteBook).not.toHaveBeenCalled();
    });
  });

  describe('End-to-end sync workflow', () => {
    it('should handle complete CREATE → sync → UPDATE → DELETE workflow', async () => {
      const tempId = 'temp-e2e-1703856000000';
      const serverId = 6001;

      // Step 1: CREATE book with temp ID
      const e2eBook = new LocalBook({ title: 'E2E Test Book', status: 'want-to-read', creationDate: new Date().toISOString(), updateDate: new Date().toISOString() } as Book);
      e2eBook.tempId = tempId;
      await bookRepository.create(e2eBook);

      (bookAPI.createBook as jest.Mock).mockResolvedValue({
        id: serverId,
        title: 'E2E Test Book',
      });
      
      (apiClient.books.createBook as jest.Mock).mockResolvedValue({
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
      
      (apiClient.books.updateBook as jest.Mock).mockResolvedValue({
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
      expect(apiClient.books.updateBook).toHaveBeenCalledWith(
        String(serverId),
        expect.any(Object)
      );

      // Step 3: DELETE book (should use server_id)
      (bookAPI.deleteBook as jest.Mock).mockResolvedValue(undefined);
      
      (apiClient.books.deleteBook as jest.Mock).mockResolvedValue(undefined);

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
      expect(apiClient.books.deleteBook).toHaveBeenCalledWith(String(serverId));
    });
  });
});
