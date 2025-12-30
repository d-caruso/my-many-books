/**
 * Tests for IDMappingService (Phase 5 - Task 5.2.3)
 *
 * Tests bidirectional mapping between temporary local IDs and server-assigned IDs
 */

import { idMappingService, IDMappingService } from '../../../src/services/sync/IDMappingService';
import { databaseService } from '../../../src/services/database/DatabaseService';
import { migrationSystem } from '../../../src/services/database/migrations';

describe('IDMappingService (Task 5.2.3)', () => {
  let service: IDMappingService;

  beforeAll(async () => {
    // Initialize database
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  beforeEach(async () => {
    // Clear all mappings before each test
    await idMappingService.clearAll();

    // Create a fresh service instance for testing
    service = new IDMappingService();
  });

  afterAll(async () => {
    // Clean up
    await idMappingService.clearAll();
    await databaseService.closeDatabase();
  });

  describe('registerTempId', () => {
    it('should register a temp ID to server ID mapping', async () => {
      const tempId = 'temp-123';
      const serverId = 42;

      await service.registerTempId(tempId, serverId, 'book');

      const retrievedServerId = await service.getServerId(tempId);
      expect(retrievedServerId).toBe(serverId);
    });

    it('should register a server ID to temp ID reverse mapping', async () => {
      const tempId = 'temp-456';
      const serverId = 789;

      await service.registerTempId(tempId, serverId, 'book');

      const retrievedTempId = await service.getTempId(serverId);
      expect(retrievedTempId).toBe(tempId);
    });

    it('should persist mapping to database', async () => {
      const tempId = 'temp-persist-test';
      const serverId = 999;

      await service.registerTempId(tempId, serverId, 'book');

      // Create a new service instance to verify persistence
      const newService = new IDMappingService();
      const retrievedServerId = await newService.getServerId(tempId);

      expect(retrievedServerId).toBe(serverId);
    });

    it('should handle multiple resource types', async () => {
      await service.registerTempId('temp-book-1', 100, 'book');
      await service.registerTempId('temp-author-1', 200, 'author');
      await service.registerTempId('temp-category-1', 300, 'category');

      expect(await service.getServerId('temp-book-1')).toBe(100);
      expect(await service.getServerId('temp-author-1')).toBe(200);
      expect(await service.getServerId('temp-category-1')).toBe(300);
    });

    it('should replace existing mapping with INSERT OR REPLACE', async () => {
      const tempId = 'temp-replace-test';

      await service.registerTempId(tempId, 111, 'book');
      await service.registerTempId(tempId, 222, 'book');

      const serverId = await service.getServerId(tempId);
      expect(serverId).toBe(222);
    });
  });

  describe('getServerId', () => {
    it('should return null for non-existent temp ID', async () => {
      const serverId = await service.getServerId('temp-nonexistent');
      expect(serverId).toBeNull();
    });

    it('should return correct server ID for existing temp ID', async () => {
      await service.registerTempId('temp-existing', 555, 'book');

      const serverId = await service.getServerId('temp-existing');
      expect(serverId).toBe(555);
    });

    it('should initialize service if not already initialized', async () => {
      const newService = new IDMappingService();

      // Register mapping first
      await idMappingService.registerTempId('temp-auto-init', 777, 'book');

      // New service should auto-initialize and load from database
      const serverId = await newService.getServerId('temp-auto-init');
      expect(serverId).toBe(777);
    });
  });

  describe('getTempId', () => {
    it('should return null for non-existent server ID', async () => {
      const tempId = await service.getTempId(99999);
      expect(tempId).toBeNull();
    });

    it('should return correct temp ID for existing server ID', async () => {
      await service.registerTempId('temp-reverse', 888, 'book');

      const tempId = await service.getTempId(888);
      expect(tempId).toBe('temp-reverse');
    });

    it('should handle reverse lookup for multiple mappings', async () => {
      await service.registerTempId('temp-1', 10, 'book');
      await service.registerTempId('temp-2', 20, 'book');
      await service.registerTempId('temp-3', 30, 'book');

      expect(await service.getTempId(10)).toBe('temp-1');
      expect(await service.getTempId(20)).toBe('temp-2');
      expect(await service.getTempId(30)).toBe('temp-3');
    });
  });

  describe('resolveForeignKeys', () => {
    beforeEach(async () => {
      // Set up test mappings
      await service.registerTempId('temp-book-123', 1001, 'book');
      await service.registerTempId('temp-author-456', 2002, 'author');
      await service.registerTempId('temp-category-789', 3003, 'category');
    });

    it('should resolve temp ID in simple object', async () => {
      const data = {
        id: 'temp-book-123',
        title: 'Test Book',
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.id).toBe(1001);
      expect(resolved.title).toBe('Test Book');
    });

    it('should resolve temp IDs with _id suffix', async () => {
      const data = {
        author_id: 'temp-author-456',
        name: 'John Doe',
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.author_id).toBe(2002);
      expect(resolved.name).toBe('John Doe');
    });

    it('should resolve temp IDs with Id suffix (camelCase)', async () => {
      const data = {
        categoryId: 'temp-category-789',
        description: 'Fiction',
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.categoryId).toBe(3003);
      expect(resolved.description).toBe('Fiction');
    });

    it('should preserve temp ID if no mapping exists', async () => {
      const data = {
        id: 'temp-unmapped-999',
        title: 'Test',
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.id).toBe('temp-unmapped-999');
      expect(resolved.title).toBe('Test');
    });

    it('should not modify non-temp-ID strings', async () => {
      const data = {
        id: 'regular-id-123',
        title: 'Test',
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.id).toBe('regular-id-123');
    });

    it('should handle nested objects', async () => {
      const data = {
        book: {
          id: 'temp-book-123',
          author: {
            id: 'temp-author-456',
            name: 'Jane Doe',
          },
        },
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.book.id).toBe(1001);
      expect(resolved.book.author.id).toBe(2002);
      expect(resolved.book.author.name).toBe('Jane Doe');
    });

    it('should handle arrays of objects', async () => {
      const data = [
        { id: 'temp-book-123', title: 'Book 1' },
        { id: 'temp-author-456', name: 'Author 1' },
      ];

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved[0].id).toBe(1001);
      expect(resolved[0].title).toBe('Book 1');
      expect(resolved[1].id).toBe(2002);
      expect(resolved[1].name).toBe('Author 1');
    });

    it('should handle arrays within objects', async () => {
      const data = {
        books: [
          { id: 'temp-book-123', title: 'Book 1' },
        ],
        authors: [
          { author_id: 'temp-author-456', name: 'Author 1' },
        ],
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.books[0].id).toBe(1001);
      expect(resolved.authors[0].author_id).toBe(2002);
    });

    it('should handle null values', async () => {
      const data = {
        id: 'temp-book-123',
        authorId: null,
      };

      const resolved = await service.resolveForeignKeys(data);

      expect(resolved.id).toBe(1001);
      expect(resolved.authorId).toBeNull();
    });

    it('should handle primitive values', async () => {
      expect(await service.resolveForeignKeys('string')).toBe('string');
      expect(await service.resolveForeignKeys(123)).toBe(123);
      expect(await service.resolveForeignKeys(true)).toBe(true);
      expect(await service.resolveForeignKeys(null)).toBeNull();
    });
  });

  describe('getAllMappings', () => {
    it('should return empty array when no mappings exist', async () => {
      const mappings = await service.getAllMappings();
      expect(mappings).toEqual([]);
    });

    it('should return all registered mappings', async () => {
      await service.registerTempId('temp-1', 100, 'book');
      await service.registerTempId('temp-2', 200, 'book');
      await service.registerTempId('temp-3', 300, 'author');

      const mappings = await service.getAllMappings();

      expect(mappings).toHaveLength(3);
      expect(mappings).toContainEqual({ tempId: 'temp-1', serverId: 100 });
      expect(mappings).toContainEqual({ tempId: 'temp-2', serverId: 200 });
      expect(mappings).toContainEqual({ tempId: 'temp-3', serverId: 300 });
    });
  });

  describe('clearAll', () => {
    it('should clear all in-memory mappings', async () => {
      await service.registerTempId('temp-clear-1', 111, 'book');
      await service.registerTempId('temp-clear-2', 222, 'book');

      await service.clearAll();

      expect(await service.getServerId('temp-clear-1')).toBeNull();
      expect(await service.getServerId('temp-clear-2')).toBeNull();
    });

    it('should clear all database mappings', async () => {
      await service.registerTempId('temp-db-clear', 333, 'book');
      await service.clearAll();

      // Create new service instance to verify database was cleared
      const newService = new IDMappingService();
      const serverId = await newService.getServerId('temp-db-clear');

      expect(serverId).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should only initialize once', async () => {
      const newService = new IDMappingService();

      // Call initialize multiple times
      await newService.initialize();
      await newService.initialize();
      await newService.initialize();

      // Should work without errors (idempotent)
      const mappings = await newService.getAllMappings();
      expect(Array.isArray(mappings)).toBe(true);
    });

    it('should load existing mappings from database on initialize', async () => {
      // Register mappings with existing service
      await idMappingService.registerTempId('temp-load-1', 444, 'book');
      await idMappingService.registerTempId('temp-load-2', 555, 'author');

      // Create new service and initialize
      const newService = new IDMappingService();
      await newService.initialize();

      // Should have loaded mappings from database
      expect(await newService.getServerId('temp-load-1')).toBe(444);
      expect(await newService.getServerId('temp-load-2')).toBe(555);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete sync workflow', async () => {
      // 1. Create book with temp ID
      const tempBookId = 'temp-1703856000000';

      // 2. Book syncs to server, receives server ID
      const serverBookId = 5001;
      await service.registerTempId(tempBookId, serverBookId, 'book');

      // 3. Create another book referencing first book
      const payloadWithForeignKey = {
        id: 'temp-1703856001000',
        relatedBookId: tempBookId, // Reference to first book
        title: 'Sequel Book',
      };

      // 4. Resolve foreign keys before sending to server
      const resolved = await service.resolveForeignKeys(payloadWithForeignKey);

      expect(resolved.id).toBe('temp-1703856001000'); // Not yet synced
      expect(resolved.relatedBookId).toBe(5001); // Resolved to server ID
      expect(resolved.title).toBe('Sequel Book');
    });

    it('should handle bidirectional lookups in sync conflict resolution', async () => {
      const tempId = 'temp-conflict-1703856000000';
      const serverId = 6001;

      await service.registerTempId(tempId, serverId, 'book');

      // Forward lookup: temp → server
      expect(await service.getServerId(tempId)).toBe(serverId);

      // Reverse lookup: server → temp
      expect(await service.getTempId(serverId)).toBe(tempId);
    });

    it('should persist across service restarts', async () => {
      // First service instance
      const service1 = new IDMappingService();
      await service1.registerTempId('temp-persist-1', 7001, 'book');

      // Second service instance (simulates app restart)
      const service2 = new IDMappingService();
      const serverId = await service2.getServerId('temp-persist-1');

      expect(serverId).toBe(7001);
    });
  });
});
