import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useBooks } from '../../src/hooks/useBooks';
import { bookAPI } from '../../src/services/api';
import { bookRepository } from '../../src/services/database/BookRepository';
import { databaseService } from '../../src/services/database/DatabaseService';
import { migrationSystem } from '../../src/services/database/migrations';

// Mock the API
jest.mock('../../src/services/api');
const mockBookAPI = bookAPI as jest.Mocked<typeof bookAPI>;

// Mock UUID
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

describe('useBooks with SQLite', () => {
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

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize database on mount', async () => {
      const { result } = renderHook(() => useBooks());

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.books).toBeDefined();
      expect(Array.isArray(result.current.books)).toBe(true);
    });

    it('should load books from database on mount', async () => {
      // Pre-populate database
      await bookRepository.create({
        title: 'Test Book',
        _syncStatus: 'synced',
      });

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      expect(result.current.books[0].title).toBe('Test Book');
    });
  });

  describe('createBook - optimistic updates', () => {
    it('should create book optimistically with temp ID', async () => {
      const newBookData = { title: 'New Book', authors: 'Author Name' };
      const serverBook = { id: 123, ...newBookData, creationDate: new Date().toISOString(), updateDate: new Date().toISOString() };

      mockBookAPI.createBook.mockResolvedValueOnce(serverBook);

      const { result } = renderHook(() => useBooks());

      await act(async () => {
        await result.current.createBook(newBookData);
      });

      // Should have book with temp ID first, then replace with server ID
      await waitFor(() => {
        const books = result.current.books;
        expect(books.length).toBeGreaterThan(0);
        const book = books.find(b => b.id === 123);
        expect(book).toBeDefined();
        expect(book?.title).toBe('New Book');
        expect(book?._syncStatus).toBe('synced');
      });
    });

    it('should keep optimistic book on retriable error', async () => {
      const newBookData = { title: 'Offline Book' };
      const networkError = new Error('Network error');
      (networkError as any).response = undefined; // Network error has no response

      mockBookAPI.createBook.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useBooks());

      await act(async () => {
        const book = await result.current.createBook(newBookData);
        expect(book._tempId).toBeDefined();
        expect(book._syncStatus).toBe('pending');
      });

      // Book should be in database with pending status
      const dbBooks = await bookRepository.findPendingSync();
      expect(dbBooks).toHaveLength(1);
      expect(dbBooks[0].title).toBe('Offline Book');
    });

    it('should remove optimistic book on non-retriable error', async () => {
      const newBookData = { title: 'Invalid Book' };
      const validationError = new Error('Validation failed');
      (validationError as any).response = { status: 400, data: { message: 'Invalid data' } };

      mockBookAPI.createBook.mockRejectedValueOnce(validationError);

      const { result } = renderHook(() => useBooks());

      await act(async () => {
        try {
          await result.current.createBook(newBookData);
        } catch (error) {
          expect(error.message).toContain('Invalid data');
        }
      });

      // Book should be removed from database
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(0);
    });
  });

  describe('updateBook - optimistic updates', () => {
    it('should update book optimistically', async () => {
      // Create initial book
      const initialBook = await bookRepository.create({
        id: '456',
        title: 'Original Title',
        _syncStatus: 'synced',
      });

      const updatedBookData = { title: 'Updated Title', rating: 5 };
      const serverBook = { id: 456, ...updatedBookData, updateDate: new Date().toISOString() };

      mockBookAPI.updateBook.mockResolvedValueOnce(serverBook);

      const { result } = renderHook(() => useBooks());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateBook(456, updatedBookData);
      });

      // Should show updated title immediately
      await waitFor(() => {
        const book = result.current.books.find(b => b.id === 456);
        expect(book?.title).toBe('Updated Title');
        expect(book?.rating).toBe(5);
        expect(book?._syncStatus).toBe('synced');
      });
    });

    it('should keep pending status on retriable error', async () => {
      const initialBook = await bookRepository.create({
        id: '789',
        title: 'Original',
        _syncStatus: 'synced',
      });

      const networkError = new Error('Server error');
      (networkError as any).response = { status: 500 };

      mockBookAPI.updateBook.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      await act(async () => {
        try {
          await result.current.updateBook(789, { title: 'Updated' });
        } catch (error) {
          // Error expected
        }
      });

      // Book should have pending status
      const dbBook = await bookRepository.findById('789');
      expect(dbBook?.title).toBe('Updated');
      expect(dbBook?._syncStatus).toBe('pending');
    });
  });

  describe('deleteBook - optimistic updates', () => {
    it('should soft delete book optimistically', async () => {
      const book = await bookRepository.create({
        id: '999',
        title: 'Book to Delete',
        _syncStatus: 'synced',
      });

      mockBookAPI.deleteBook.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteBook(999);
      });

      // Book should be removed from UI
      await waitFor(() => {
        expect(result.current.books).toHaveLength(0);
      });

      // But should be hard-deleted from database after server confirms
      await waitFor(async () => {
        const dbBook = await databaseService.getFirstAsync(
          'SELECT * FROM books WHERE id = ?',
          ['999']
        );
        expect(dbBook).toBeNull();
      });
    });

    it('should restore book on non-retriable delete error', async () => {
      const book = await bookRepository.create({
        id: '888',
        title: 'Protected Book',
        _syncStatus: 'synced',
      });

      const forbiddenError = new Error('Forbidden');
      (forbiddenError as any).response = { status: 403, data: { message: 'Cannot delete' } };

      mockBookAPI.deleteBook.mockRejectedValueOnce(forbiddenError);

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      await act(async () => {
        try {
          await result.current.deleteBook(888);
        } catch (error) {
          expect(error.message).toContain('Cannot delete');
        }
      });

      // Book should be restored
      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      const dbBook = await bookRepository.findById('888');
      expect(dbBook).toBeDefined();
      expect(dbBook?._deleted).toBe(false);
    });
  });

  describe('updateBookStatus - optimistic updates', () => {
    it('should update status optimistically', async () => {
      const book = await bookRepository.create({
        id: '555',
        title: 'Status Test Book',
        status: 'want-to-read',
        _syncStatus: 'synced',
      });

      mockBookAPI.updateBook.mockResolvedValueOnce({
        id: 555,
        title: 'Status Test Book',
        status: 'reading',
        updateDate: new Date().toISOString(),
      });

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateBookStatus(555, 'reading');
      });

      // Should show updated status immediately
      await waitFor(() => {
        const book = result.current.books.find(b => b.id === 555);
        expect(book?.status).toBe('reading');
        expect(book?._syncStatus).toBe('synced');
      });
    });
  });

  describe('loadBooks - server sync', () => {
    it('should load and store books from server', async () => {
      const serverBooks = [
        { id: 1, title: 'Server Book 1', updateDate: new Date().toISOString() },
        { id: 2, title: 'Server Book 2', updateDate: new Date().toISOString() },
      ];

      mockBookAPI.getBooks.mockResolvedValueOnce({ books: serverBooks });

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(2);
      });

      // Books should be in database
      const dbBooks = await bookRepository.findAll();
      expect(dbBooks).toHaveLength(2);
      expect(dbBooks.every(b => b._syncStatus === 'synced')).toBe(true);
    });

    it('should load from database when server fails', async () => {
      // Pre-populate database
      await bookRepository.create({ title: 'Cached Book', _syncStatus: 'synced' });

      const networkError = new Error('No connection');
      mockBookAPI.getBooks.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useBooks());

      await waitFor(() => {
        expect(result.current.books).toHaveLength(1);
        expect(result.current.books[0].title).toBe('Cached Book');
      });

      expect(result.current.error).toBeTruthy();
    });
  });
});
