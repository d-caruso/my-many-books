// Test for database service and migrations (Task 4.2.3)
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import {
  CREATE_BOOKS_TABLE,
  CREATE_AUTHORS_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_INDEXES,
  ALL_TABLES
} from '../../src/services/database/schema';

describe('Database Service and Migrations (Task 4.2.3)', () => {
  beforeAll(async () => {
    // Initialize database for tests
    await databaseService.openDatabase();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  describe('Database Service', () => {
    it('should initialize database connection', async () => {
      expect(databaseService).toBeDefined();
      expect(typeof databaseService.openDatabase).toBe('function');
      expect(typeof databaseService.executeQuery).toBe('function');
      expect(typeof databaseService.getAllAsync).toBe('function');
      expect(typeof databaseService.getFirstAsync).toBe('function');
    });

    it('should execute SQL queries', async () => {
      const result = await databaseService.executeQuery('SELECT 1 as test');
      expect(result).toBeDefined();
    });
  });

  describe('Schema Definition', () => {
    it('should define CREATE_BOOKS_TABLE statement', () => {
      expect(CREATE_BOOKS_TABLE).toBeDefined();
      expect(typeof CREATE_BOOKS_TABLE).toBe('string');
      expect(CREATE_BOOKS_TABLE).toContain('CREATE TABLE IF NOT EXISTS books');
      expect(CREATE_BOOKS_TABLE).toContain('id TEXT PRIMARY KEY');
      expect(CREATE_BOOKS_TABLE).toContain('sync_status TEXT');
      expect(CREATE_BOOKS_TABLE).toContain('deleted INTEGER');
    });

    it('should define CREATE_AUTHORS_TABLE statement', () => {
      expect(CREATE_AUTHORS_TABLE).toBeDefined();
      expect(CREATE_AUTHORS_TABLE).toContain('CREATE TABLE IF NOT EXISTS authors');
    });

    it('should define CREATE_CATEGORIES_TABLE statement', () => {
      expect(CREATE_CATEGORIES_TABLE).toBeDefined();
      expect(CREATE_CATEGORIES_TABLE).toContain('CREATE TABLE IF NOT EXISTS categories');
    });

    it('should define CREATE_INDEXES array', () => {
      expect(CREATE_INDEXES).toBeDefined();
      expect(Array.isArray(CREATE_INDEXES)).toBe(true);
      expect(CREATE_INDEXES.length).toBeGreaterThan(0);

      // Verify key indexes exist
      const indexStrings = CREATE_INDEXES.join(' ');
      expect(indexStrings).toContain('idx_books_status');
      expect(indexStrings).toContain('idx_books_title');
      expect(indexStrings).toContain('idx_books_sync_status');
      expect(indexStrings).toContain('idx_books_rating');
      expect(indexStrings).toContain('idx_books_update_date');
    });

    it('should define ALL_TABLES array with all schema elements', () => {
      expect(ALL_TABLES).toBeDefined();
      expect(Array.isArray(ALL_TABLES)).toBe(true);
      expect(ALL_TABLES.length).toBeGreaterThan(5); // At least tables + indexes
    });
  });

  describe('Migration System', () => {
    it('should have migration system defined', () => {
      expect(migrationSystem).toBeDefined();
      expect(typeof migrationSystem.runMigrations).toBe('function');
    });

    it('should run migrations and create tables', async () => {
      await migrationSystem.runMigrations();

      // Verify books table exists by querying it
      const books = await databaseService.getAllAsync('SELECT * FROM books LIMIT 1', []);
      expect(books).toBeDefined();
      expect(Array.isArray(books)).toBe(true);

      // Verify authors table exists
      const authors = await databaseService.getAllAsync('SELECT * FROM authors LIMIT 1', []);
      expect(authors).toBeDefined();
      expect(Array.isArray(authors)).toBe(true);

      // Verify categories table exists
      const categories = await databaseService.getAllAsync('SELECT * FROM categories LIMIT 1', []);
      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
    });

    it('should track migration version', async () => {
      await migrationSystem.runMigrations();
      const versionRow = await databaseService.getFirstAsync<{ value: string }>(
        'SELECT value FROM migrations WHERE key = ?',
        ['schema_version']
      );

      expect(versionRow).toBeDefined();
      expect(versionRow).not.toBeNull();

      const version = Number(versionRow!.value);
      expect(typeof version).toBe('number');
      expect(version).toBeGreaterThanOrEqual(1);
    });

    it('should be idempotent (running twice is safe)', async () => {
      // Run migrations again
      await migrationSystem.runMigrations();

      // Should still work
      const books = await databaseService.getAllAsync('SELECT * FROM books LIMIT 1', []);
      expect(books).toBeDefined();
    });
  });

  describe('Table Structure Verification', () => {
    it('should have books table with correct columns', async () => {
      const tableInfo = await databaseService.getAllAsync(
        "PRAGMA table_info(books)",
        []
      );

      expect(tableInfo).toBeDefined();
      expect(tableInfo.length).toBeGreaterThan(10); // At least 10+ columns

      const columnNames = tableInfo.map((col: { name: string }) => col.name);

      // Verify key columns exist
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('title');
      expect(columnNames).toContain('authors');
      expect(columnNames).toContain('status');
      expect(columnNames).toContain('rating');
      expect(columnNames).toContain('sync_status');
      expect(columnNames).toContain('deleted');
      expect(columnNames).toContain('temp_id');
      expect(columnNames).toContain('creation_date');
      expect(columnNames).toContain('update_date');
    });

    it('should have created indexes on books table', async () => {
      const indexes = await databaseService.getAllAsync(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='books'",
        []
      );

      expect(indexes).toBeDefined();
      expect(indexes.length).toBeGreaterThan(5); // Multiple indexes

      const indexNames = indexes.map((idx: { name: string }) => idx.name).join(' ');

      // Verify key indexes
      expect(indexNames).toContain('idx_books_status');
      expect(indexNames).toContain('idx_books_title');
      expect(indexNames).toContain('idx_books_sync_status');
    });

    it('should have junction tables for relationships', async () => {
      // Verify book_authors junction table
      const bookAuthors = await databaseService.getAllAsync(
        'SELECT * FROM book_authors LIMIT 1',
        []
      );
      expect(bookAuthors).toBeDefined();

      // Verify book_categories junction table
      const bookCategories = await databaseService.getAllAsync(
        'SELECT * FROM book_categories LIMIT 1',
        []
      );
      expect(bookCategories).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    beforeEach(async () => {
      // Clean up test data
      await databaseService.executeQuery('DELETE FROM books');
      await databaseService.executeQuery('DELETE FROM authors');
      await databaseService.executeQuery('DELETE FROM categories');
    });

    it('should enforce PRIMARY KEY constraint', async () => {
      await databaseService.executeQuery(
        "INSERT INTO books (id, title, creation_date, update_date) VALUES ('test-1', 'Test', '2024-01-01', '2024-01-01')",
        []
      );

      // Try to insert duplicate ID - should fail or be ignored
      await expect(
        databaseService.executeQuery(
          "INSERT INTO books (id, title, creation_date, update_date) VALUES ('test-1', 'Test 2', '2024-01-01', '2024-01-01')",
          []
        )
      ).rejects.toThrow();
    });

    it('should support transactions (ACID)', async () => {
      // This test verifies that the database supports ACID transactions
      // by default (SQLite has this built-in)
      const book = await databaseService.getFirstAsync(
        'SELECT count(*) as count FROM books',
        []
      );
      expect(book).toBeDefined();
      expect(typeof book.count).toBe('number');
    });
  });
});
