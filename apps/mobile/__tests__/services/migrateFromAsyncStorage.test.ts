import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateFromAsyncStorage, needsMigration, resetMigrationFlag } from '@/services/database/migrateFromAsyncStorage';
import { bookRepository } from '@/services/database/BookRepository';
import { databaseService } from '@/services/database/DatabaseService';
import { migrationSystem } from '@/services/database/migrations';
import type { Book } from '@/types';

describe('migrateFromAsyncStorage', () => {
  beforeAll(async () => {
    // Initialize database for tests
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear database before each test
    await databaseService.executeQuery('DELETE FROM books');

    // Clear AsyncStorage
    await AsyncStorage.clear();

    // Reset migration flag
    await resetMigrationFlag();
  });

  describe('migration with different book counts', () => {
    it('should handle migration with 0 books', async () => {
      // No books in AsyncStorage
      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);

      // Check that migration flag is set
      const migrated = await AsyncStorage.getItem('asyncstorage_to_sqlite_migrated');
      expect(migrated).toBe('true');
    });

    it('should migrate 10 books successfully', async () => {
      // Create 10 books
      const books: Book[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        authors: `Author ${i + 1}`,
        status: 'reading' as const,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      }));

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(10);

      // Verify books in SQLite
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(10);
      expect(dbBooks[0].title).toBe('Book 1');
      expect(dbBooks[9].title).toBe('Book 10');
    });

    it('should migrate 100 books successfully', async () => {
      // Create 100 books
      const books: Book[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        authors: `Author ${i + 1}`,
        status: 'want-to-read' as const,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      }));

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(100);

      // Verify books in SQLite
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(100);
    });

    it('should migrate 1000 books successfully', async () => {
      // Create 1000 books
      const books: Book[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
        authors: `Author ${i + 1}`,
        status: 'completed' as const,
        rating: (i % 5) + 1,
        creationDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
      }));

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(1000);

      // Verify books in SQLite
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(1000);
      expect(dbBooks[0].title).toBe('Book 1');
      expect(dbBooks[999].title).toBe('Book 1000');
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON data gracefully', async () => {
      // Invalid JSON
      await AsyncStorage.setItem('cached_books', 'invalid json {]');

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.error).toBeDefined();

      // Migration flag should NOT be set on error
      const migrated = await AsyncStorage.getItem('asyncstorage_to_sqlite_migrated');
      expect(migrated).not.toBe('true');

      // Original data should still be in AsyncStorage (not deleted)
      const cachedData = await AsyncStorage.getItem('cached_books');
      expect(cachedData).toBe('invalid json {]');
    });

    it('should handle books with missing required fields', async () => {
      const books = [
        {
          id: 1,
          title: 'Valid Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
        {
          // Missing required fields like title
          id: 2,
        },
        {
          id: 3,
          title: 'Another Valid Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      // Migration completes but skips invalid books
      expect(result.success).toBe(true);
      // Should migrate at least the valid books (exact count depends on validation)
      expect(result.count).toBeGreaterThan(0);

      // Migration flag should be set
      const migrated = await AsyncStorage.getItem('asyncstorage_to_sqlite_migrated');
      expect(migrated).toBe('true');
    });

    it('should not lose data on migration errors', async () => {
      const books: Book[] = [
        {
          id: 1,
          title: 'Test Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      // Trigger an error by providing malformed data after setting valid data
      await AsyncStorage.setItem('cached_books', 'corrupted data');

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(false);

      // Original data should still be in AsyncStorage
      const cachedData = await AsyncStorage.getItem('cached_books');
      expect(cachedData).toBe('corrupted data'); // Data preserved

      // Migration flag should NOT be set
      const migrated = await AsyncStorage.getItem('asyncstorage_to_sqlite_migrated');
      expect(migrated).not.toBe('true');
    });
  });

  describe('migration runs only once', () => {
    it('should run migration on first call', async () => {
      const books: Book[] = [
        {
          id: 1,
          title: 'First Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result1 = await migrateFromAsyncStorage();

      expect(result1.success).toBe(true);
      expect(result1.count).toBe(1);

      // Verify book migrated
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(1);
    });

    it('should skip migration on second call (idempotent)', async () => {
      const books: Book[] = [
        {
          id: 1,
          title: 'Book 1',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      // First migration
      const result1 = await migrateFromAsyncStorage();
      expect(result1.success).toBe(true);
      expect(result1.count).toBe(1);

      // Add another book to AsyncStorage
      const moreBooks: Book[] = [
        ...books,
        {
          id: 2,
          title: 'Book 2',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
        },
      ];
      await AsyncStorage.setItem('cached_books', JSON.stringify(moreBooks));

      // Second migration should be skipped
      const result2 = await migrateFromAsyncStorage();
      expect(result2.success).toBe(true);
      expect(result2.count).toBe(0); // No new books migrated

      // Should still only have 1 book in DB (not 2)
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(1);
    });

    it('should indicate migration already completed', async () => {
      // Manually set migration flag
      await AsyncStorage.setItem('asyncstorage_to_sqlite_migrated', 'true');

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(0); // No migration performed
    });
  });

  describe('needsMigration helper', () => {
    it('should return true if migration not done', async () => {
      const needed = await needsMigration();
      expect(needed).toBe(true);
    });

    it('should return false after migration', async () => {
      await migrateFromAsyncStorage();

      const needed = await needsMigration();
      expect(needed).toBe(false);
    });
  });

  describe('resetMigrationFlag helper', () => {
    it('should reset migration flag for testing', async () => {
      // Set flag
      await AsyncStorage.setItem('asyncstorage_to_sqlite_migrated', 'true');
      expect(await needsMigration()).toBe(false);

      // Reset flag
      await resetMigrationFlag();
      expect(await needsMigration()).toBe(true);
    });
  });

  describe('data integrity', () => {
    it('should preserve all book fields during migration', async () => {
      const books: Book[] = [
        {
          id: 42,
          title: 'Complete Book',
          authors: 'Test Author',
          isbn: '1234567890',
          description: 'A test book',
          status: 'reading',
          rating: 4,
          notes: 'Great book!',
          thumbnail: 'https://example.com/cover.jpg',
          creationDate: '2024-01-01T00:00:00.000Z',
          updateDate: '2024-01-02T00:00:00.000Z',
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      // Verify all fields preserved
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(1);

      const migratedBook = dbBooks[0];
      expect(migratedBook.title).toBe('Complete Book');
      expect(migratedBook.authors).toBe('Test Author');
      expect(migratedBook.isbn).toBe('1234567890');
      expect(migratedBook.description).toBe('A test book');
      expect(migratedBook.status).toBe('reading');
      expect(migratedBook.rating).toBe(4);
      expect(migratedBook.notes).toBe('Great book!');
      expect(migratedBook.thumbnail).toBe('https://example.com/cover.jpg');
    });

    it('should handle books with optional fields missing', async () => {
      const books: Book[] = [
        {
          id: 1,
          title: 'Minimal Book',
          creationDate: new Date().toISOString(),
          updateDate: new Date().toISOString(),
          // No authors, isbn, description, etc.
        },
      ];

      await AsyncStorage.setItem('cached_books', JSON.stringify(books));

      const result = await migrateFromAsyncStorage();

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(1);
      expect(dbBooks[0].title).toBe('Minimal Book');
    });
  });
});
