import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';
import { LocalBook } from '../../src/entities/LocalBook';
import { SYNC_STATUS } from '../../src/types';
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
      const book = new LocalBook({ title: 'Test Book', authors: 'Test Author', status: 'want-to-read' } as Book);

      const created = await bookRepository.create(book);

      expect(created).toBeDefined();
      expect(created.entity.id).toBeDefined();
      expect(created.entity.title).toBe('Test Book');
      expect(created.entity.authors).toBe('Test Author');
      expect(created.entity.status).toBe('want-to-read');
      expect(created.syncStatus).toBe('synced');
    });

    it('should create a book with temp ID', async () => {
      const book = new LocalBook({ title: 'Temp Book' } as Book);
      book.tempId = 'temp-123';
      book.syncStatus = SYNC_STATUS.PENDING;

      const created = await bookRepository.create(book);

      expect(created.tempId).toBe('temp-123');
      expect(created.syncStatus).toBe('pending');
    });
  });

  describe('findAll', () => {
    it('should return all non-deleted books', async () => {
      const now = Date.now();
      const book1 = new LocalBook({ title: 'Book 1', updateDate: new Date(now - 1000).toISOString() } as Book);
      const book2 = new LocalBook({ title: 'Book 2', updateDate: new Date(now).toISOString() } as Book);
      await bookRepository.create(book1);
      await bookRepository.create(book2);

      const books = await bookRepository.findAll();

      expect(books).toHaveLength(2);
      expect(books[0].entity.title).toBe('Book 2'); // Newest first
      expect(books[1].entity.title).toBe('Book 1');
    });

    it('should not return deleted books', async () => {
      const b1 = new LocalBook({ title: 'Book 1' } as Book);
      const b2 = new LocalBook({ title: 'Book 2' } as Book);
      const book1 = await bookRepository.create(b1);
      await bookRepository.create(b2);
      await bookRepository.delete(String(book1.entity.id));

      const books = await bookRepository.findAll();

      expect(books).toHaveLength(1);
      expect(books[0].entity.title).toBe('Book 2');
    });
  });

  describe('findById', () => {
    it('should find book by ID', async () => {
      const created = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      const found = await bookRepository.findById(String(created.entity.id));

      expect(found).toBeDefined();
      expect(found?.entity.id).toBe(created.entity.id);
      expect(found?.entity.title).toBe('Test Book');
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookRepository.findById('non-existent');

      expect(found).toBeNull();
    });

    it('should return null for deleted book', async () => {
      const created = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));
      await bookRepository.delete(String(created.entity.id));

      const found = await bookRepository.findById(String(created.entity.id));

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update book fields', async () => {
      const created = await bookRepository.create(
        new LocalBook({ title: 'Original Title', status: 'want-to-read' } as Book)
      );

      const updates = new LocalBook({ title: 'Updated Title', status: 'reading', rating: 4 } as Book);
      const updated = await bookRepository.update(String(created.entity.id), updates);

      expect(updated.entity.title).toBe('Updated Title');
      expect(updated.entity.status).toBe('reading');
      expect((updated.entity as Record<string, unknown>).rating).toBe(4);
    });

    it('should update sync status', async () => {
      const created = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      await bookRepository.updateSyncFields(String(created.entity.id), { syncStatus: SYNC_STATUS.PENDING });
      const updated = await bookRepository.findById(String(created.entity.id));

      expect(updated?.syncStatus).toBe('pending');
    });
  });

  describe('delete', () => {
    it('should soft delete book', async () => {
      const created = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      await bookRepository.delete(String(created.entity.id));

      // Book should not appear in findAll
      const allBooks = await bookRepository.findAll();
      expect(allBooks).toHaveLength(0);

      // But should still exist in database with _deleted = 1
      const raw = await databaseService.getFirstAsync(
        'SELECT * FROM books WHERE id = ?',
        [String(created.entity.id)]
      );
      expect(raw).toBeDefined();
      expect(raw.deleted).toBe(1);
      expect(raw.sync_status).toBe('pending');
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete book', async () => {
      const created = await bookRepository.create(new LocalBook({ title: 'Test Book' } as Book));

      await bookRepository.hardDelete(String(created.entity.id));

      // Book should not exist in database at all
      const raw = await databaseService.getFirstAsync(
        'SELECT * FROM books WHERE id = ?',
        [String(created.entity.id)]
      );
      expect(raw).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await bookRepository.create(new LocalBook({ title: 'The Great Gatsby', authors: 'F. Scott Fitzgerald' } as Book));
      await bookRepository.create(new LocalBook({ title: 'Great Expectations', authors: 'Charles Dickens' } as Book));
      await bookRepository.create(new LocalBook({ title: 'To Kill a Mockingbird', authors: 'Harper Lee' } as Book));
    });

    it('should search by title', async () => {
      const results = await bookRepository.search('Great');

      expect(results).toHaveLength(2);
      expect(results.some(b => b.entity.title === 'The Great Gatsby')).toBe(true);
      expect(results.some(b => b.entity.title === 'Great Expectations')).toBe(true);
    });

    it('should search by author', async () => {
      const results = await bookRepository.search('Dickens');

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('Great Expectations');
    });

    it('should be case-insensitive', async () => {
      const results = await bookRepository.search('gatsby');

      expect(results).toHaveLength(1);
      expect(results[0].entity.title).toBe('The Great Gatsby');
    });
  });

  describe('findByStatus', () => {
    beforeEach(async () => {
      await bookRepository.create(new LocalBook({ title: 'Book 1', status: 'want-to-read' } as Book));
      await bookRepository.create(new LocalBook({ title: 'Book 2', status: 'reading' } as Book));
      await bookRepository.create(new LocalBook({ title: 'Book 3', status: 'want-to-read' } as Book));
    });

    it('should find books by status', async () => {
      const wantToRead = await bookRepository.findByStatus('want-to-read');

      expect(wantToRead).toHaveLength(2);
      expect(wantToRead.every(b => b.entity.status === 'want-to-read')).toBe(true);
    });

    it('should return empty array for non-existent status', async () => {
      const completed = await bookRepository.findByStatus('completed');

      expect(completed).toHaveLength(0);
    });
  });

  describe('findPendingSync', () => {
    it('should find books with pending sync status', async () => {
      const syncedBook = new LocalBook({ title: 'Synced Book' } as Book);
      syncedBook.syncStatus = SYNC_STATUS.SYNCED;
      await bookRepository.create(syncedBook);

      const pendingBook = new LocalBook({ title: 'Pending Book' } as Book);
      pendingBook.syncStatus = SYNC_STATUS.PENDING;
      await bookRepository.create(pendingBook);

      const failedBook = new LocalBook({ title: 'Failed Book' } as Book);
      failedBook.syncStatus = SYNC_STATUS.FAILED;
      await bookRepository.create(failedBook);

      const pending = await bookRepository.findPendingSync();

      expect(pending).toHaveLength(2);
      expect(pending.some(b => b.entity.title === 'Pending Book')).toBe(true);
      expect(pending.some(b => b.entity.title === 'Failed Book')).toBe(true);
    });
  });
});
