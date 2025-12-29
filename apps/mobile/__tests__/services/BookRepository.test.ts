import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import type { Book } from '../../src/types';

describe('BookRepository', () => {
  beforeAll(async () => {
    // Initialize database
    await databaseService.openDatabase();
    await migrationSystem.runMigrations();
  });

  afterAll(async () => {
    // Clean up
    await databaseService.closeDatabase();
  });

  beforeEach(async () => {
    // Clear books table before each test
    await databaseService.executeQuery('DELETE FROM books');
  });

  describe('create', () => {
    it('should create a new book', async () => {
      const bookData: Partial<Book> = {
        title: 'Test Book',
        authors: 'Test Author',
        status: 'want-to-read',
      };

      const created = await bookRepository.create(bookData);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.title).toBe('Test Book');
      expect(created.authors).toBe('Test Author');
      expect(created.status).toBe('want-to-read');
      expect(created._syncStatus).toBe('synced');
    });

    it('should create a book with temp ID', async () => {
      const bookData: Partial<Book> = {
        _tempId: 'temp-123',
        title: 'Temp Book',
        _syncStatus: 'pending',
      };

      const created = await bookRepository.create(bookData);

      expect(created._tempId).toBe('temp-123');
      expect(created._syncStatus).toBe('pending');
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted books', async () => {
      const now = Date.now();
      await bookRepository.create({
        title: 'Book 1',
        updateDate: new Date(now - 1000).toISOString()  // 1 second ago
      });
      await bookRepository.create({
        title: 'Book 2',
        updateDate: new Date(now).toISOString()  // Now
      });

      const books = await bookRepository.findAll();

      expect(books).toHaveLength(2);
      expect(books[0].title).toBe('Book 2'); // Newest first
      expect(books[1].title).toBe('Book 1');
    });

    it('should not return deleted books', async () => {
      const book1 = await bookRepository.create({ title: 'Book 1' });
      await bookRepository.create({ title: 'Book 2' });
      await bookRepository.delete(book1.id);

      const books = await bookRepository.findAll();

      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Book 2');
    });
  });

  describe('findById', () => {
    it('should find book by ID', async () => {
      const created = await bookRepository.create({ title: 'Test Book' });

      const found = await bookRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test Book');
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookRepository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('should return null for deleted book', async () => {
      const created = await bookRepository.create({ title: 'Test Book' });
      await bookRepository.delete(created.id);

      const found = await bookRepository.findById(created.id);

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update book fields', async () => {
      const created = await bookRepository.create({
        title: 'Original Title',
        status: 'want-to-read',
      });

      const updated = await bookRepository.update(created.id, {
        title: 'Updated Title',
        status: 'reading',
        rating: 4,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe('reading');
      expect(updated.rating).toBe(4);
    });

    it('should update sync status', async () => {
      const created = await bookRepository.create({ title: 'Test Book' });

      const updated = await bookRepository.update(created.id, {
        _syncStatus: 'pending',
      });

      expect(updated._syncStatus).toBe('pending');
    });
  });

  describe('delete', () => {
    it('should soft delete book', async () => {
      const created = await bookRepository.create({ title: 'Test Book' });

      await bookRepository.delete(created.id);

      // Book should not appear in findAll
      const allBooks = await bookRepository.findAll();
      expect(allBooks).toHaveLength(0);

      // But should still exist in database with _deleted = 1
      const raw = await databaseService.getFirstAsync(
        'SELECT * FROM books WHERE id = ?',
        [created.id]
      );
      expect(raw).toBeDefined();
      expect(raw._deleted).toBe(1);
      expect(raw._sync_status).toBe('pending');
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete book', async () => {
      const created = await bookRepository.create({ title: 'Test Book' });

      await bookRepository.hardDelete(created.id);

      // Book should not exist in database at all
      const raw = await databaseService.getFirstAsync(
        'SELECT * FROM books WHERE id = ?',
        [created.id]
      );
      expect(raw).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await bookRepository.create({ title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald' });
      await bookRepository.create({ title: 'Great Expectations', authors: 'Charles Dickens' });
      await bookRepository.create({ title: 'To Kill a Mockingbird', authors: 'Harper Lee' });
    });

    it('should search by title', async () => {
      const results = await bookRepository.search('Great');

      expect(results).toHaveLength(2);
      expect(results.some(b => b.title === 'The Great Gatsby')).toBe(true);
      expect(results.some(b => b.title === 'Great Expectations')).toBe(true);
    });

    it('should search by author', async () => {
      const results = await bookRepository.search('Dickens');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Great Expectations');
    });

    it('should be case-insensitive', async () => {
      const results = await bookRepository.search('gatsby');

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('The Great Gatsby');
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      await bookRepository.create({ title: 'Book 1', status: 'want-to-read' });
      await bookRepository.create({ title: 'Book 2', status: 'reading' });
      await bookRepository.create({ title: 'Book 3', status: 'want-to-read' });
    });

    it('should find books by status', async () => {
      const wantToRead = await bookRepository.findByStatus('want-to-read');

      expect(wantToRead).toHaveLength(2);
      expect(wantToRead.every(b => b.status === 'want-to-read')).toBe(true);
    });

    it('should return empty array for non-existent status', async () => {
      const completed = await bookRepository.findByStatus('completed');

      expect(completed).toHaveLength(0);
    });
  });

  describe('findPendingSync', () => {
    it('should find books with pending sync status', async () => {
      await bookRepository.create({ title: 'Synced Book', _syncStatus: 'synced' });
      await bookRepository.create({ title: 'Pending Book', _syncStatus: 'pending' });
      await bookRepository.create({ title: 'Failed Book', _syncStatus: 'failed' });

      const pending = await bookRepository.findPendingSync();

      expect(pending).toHaveLength(2);
      expect(pending.some(b => b.title === 'Pending Book')).toBe(true);
      expect(pending.some(b => b.title === 'Failed Book')).toBe(true);
    });
  });
});
