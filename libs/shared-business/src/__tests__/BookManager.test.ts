import { BookManager, type BookAPI } from '../BookManager';
import type { Book, BookFormData } from '@my-many-books/shared-types';

const VALID_ISBN_13_WITH_DASHES = '978-0-451-52493-5';
const VALID_ISBN_13 = '9780451524935';

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: 1,
  isbnCode: VALID_ISBN_13,
  title: '1984',
  status: 'reading',
  ...overrides,
});

const createMocks = () => {
  const api: jest.Mocked<BookAPI> = {
    searchByISBN: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    updateBookStatus: jest.fn(),
  };

  return { api };
};

describe('BookManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addBookByISBN', () => {
    it('rejects invalid ISBNs', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      await expect(manager.addBookByISBN('123', { title: 'Test' })).rejects.toThrow(
        'Invalid ISBN format: 123. Please enter a valid 10 or 13 digit ISBN.'
      );
      expect(api.searchByISBN).not.toHaveBeenCalled();
      expect(api.createBook).not.toHaveBeenCalled();
    });

    it('normalizes ISBN before searching', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.searchByISBN.mockResolvedValue(null);
      api.createBook.mockResolvedValue(createBook());

      await manager.addBookByISBN(VALID_ISBN_13_WITH_DASHES, { title: '1984' });

      expect(api.searchByISBN).toHaveBeenCalledWith(VALID_ISBN_13);
    });

    it('rejects duplicates', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.searchByISBN.mockResolvedValue(createBook());

      await expect(
        manager.addBookByISBN(VALID_ISBN_13, { title: 'Already there' })
      ).rejects.toThrow('Book already exists in your library');
      expect(api.createBook).not.toHaveBeenCalled();
    });

    it('requires a non-empty title', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.searchByISBN.mockResolvedValue(null);

      await expect(manager.addBookByISBN(VALID_ISBN_13)).rejects.toThrow(
        'Book title is required'
      );
      await expect(
        manager.addBookByISBN(VALID_ISBN_13, { title: '   ' })
      ).rejects.toThrow('Book title is required');
      expect(api.createBook).not.toHaveBeenCalled();
    });

    it('creates a book with normalized ISBN and merged data', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.searchByISBN.mockResolvedValue(null);
      api.createBook.mockImplementation(async (data: BookFormData) =>
        createBook({ isbnCode: data.isbnCode, title: data.title })
      );

      const created = await manager.addBookByISBN(VALID_ISBN_13_WITH_DASHES, {
        title: '1984',
        notes: 'Classic',
      });

      expect(api.createBook).toHaveBeenCalledWith({
        isbnCode: VALID_ISBN_13,
        title: '1984',
        notes: 'Classic',
      });
      expect(created.isbnCode).toBe(VALID_ISBN_13);
      expect(created.title).toBe('1984');
    });
  });

  describe('updateBookStatus', () => {
    it('rejects invalid statuses', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      await expect(manager.updateBookStatus(1, null as any)).rejects.toThrow(
        'Invalid status: null. Must be one of: reading, paused, finished'
      );
      await expect(manager.updateBookStatus(1, 'completed' as any)).rejects.toThrow(
        'Invalid status: completed. Must be one of: reading, paused, finished'
      );
      expect(api.updateBookStatus).not.toHaveBeenCalled();
    });

    it('delegates to API for valid statuses', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.updateBookStatus.mockResolvedValue(createBook({ status: 'paused' }));

      const updated = await manager.updateBookStatus(1, 'paused');

      expect(api.updateBookStatus).toHaveBeenCalledWith(1, 'paused');
      expect(updated.status).toBe('paused');
    });
  });

  describe('updateBook', () => {
    it('normalizes ISBN when updating', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      api.updateBook.mockResolvedValue(createBook({ isbnCode: VALID_ISBN_13 }));

      const updates: Partial<BookFormData> = { isbnCode: VALID_ISBN_13_WITH_DASHES };
      await manager.updateBook(1, updates);

      expect(api.updateBook).toHaveBeenCalledWith(1, { isbnCode: VALID_ISBN_13 });
      expect(updates.isbnCode).toBe(VALID_ISBN_13);
    });

    it('rejects invalid ISBN updates', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      await expect(manager.updateBook(1, { isbnCode: 'bad' })).rejects.toThrow(
        'Invalid ISBN format: bad'
      );
      expect(api.updateBook).not.toHaveBeenCalled();
    });

    it('rejects empty titles', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      await expect(manager.updateBook(1, { title: '   ' })).rejects.toThrow(
        'Book title cannot be empty'
      );
      expect(api.updateBook).not.toHaveBeenCalled();
    });

    it('rejects invalid edition numbers', async () => {
      const { api } = createMocks();
      const manager = new BookManager(api);

      await expect(manager.updateBook(1, { editionNumber: 0 })).rejects.toThrow(
        'Edition number must be at least 1'
      );
      expect(api.updateBook).not.toHaveBeenCalled();
    });
  });

  describe('static helpers', () => {
    it('calculates reading stats', () => {
      const books: Book[] = [
        createBook({ id: 1, status: 'reading' }),
        createBook({ id: 2, status: 'paused' }),
        createBook({ id: 3, status: 'finished' }),
      ];

      expect(BookManager.calculateReadingStats(books)).toEqual({
        total: 3,
        inProgress: 1,
        paused: 1,
        finished: 1,
        percentageComplete: 33,
      });
    });

    it('groups books by status and uses unknown for missing status', () => {
      const books: Book[] = [
        createBook({ id: 1, status: 'reading' }),
        createBook({ id: 2, status: undefined }),
      ];

      const grouped = BookManager.groupBooksByStatus(books);
      expect(grouped.reading).toHaveLength(1);
      expect(grouped.unknown).toHaveLength(1);
    });

    it('finds books by author (case-insensitive)', () => {
      const books: Book[] = [
        createBook({
          id: 1,
          authors: [{ id: 1, name: 'George', surname: 'Orwell' }],
        }),
        createBook({
          id: 2,
          authors: [{ id: 2, name: 'Jane', surname: 'Austen' }],
        }),
      ];

      const result = BookManager.findBooksByAuthor(books, 'orWELL');
      expect(result.map(b => b.id)).toEqual([1]);
    });
  });
});

