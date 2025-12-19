import { SearchManager, type SearchAPI } from '../SearchManager';
import type { Author, Book, Category, SearchResult } from '@my-many-books/shared-types';

const VALID_ISBN_13_WITH_DASHES = '978-0-451-52493-5';
const VALID_ISBN_13 = '9780451524935';

const createBook = (overrides: Partial<Book> = {}): Book => ({
  id: 1,
  isbnCode: VALID_ISBN_13,
  title: '1984',
  status: 'reading',
  creationDate: '2025-01-01T00:00:00.000Z',
  updateDate: '2025-01-01T00:00:00.000Z',
  ...overrides,
});

const createSearchResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  books: [createBook()],
  total: 1,
  hasMore: false,
  page: 1,
  ...overrides,
});

const createMocks = () => {
  const api: jest.Mocked<SearchAPI> = {
    searchBooks: jest.fn(),
    searchAuthors: jest.fn(),
    getCategories: jest.fn(),
  };

  return { api };
};

describe('SearchManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('smartSearch', () => {
    it('returns an empty result when query is empty and no filters are active', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      const result = await manager.smartSearch('   ');

      expect(result).toEqual({ books: [], total: 0, hasMore: false, page: 1 });
      expect(api.searchBooks).not.toHaveBeenCalled();
    });

    it('treats ISBN-like queries as ISBN search and normalizes ISBN', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchBooks.mockResolvedValue(createSearchResult());

      await manager.smartSearch(VALID_ISBN_13_WITH_DASHES);

      expect(api.searchBooks).toHaveBeenCalledWith(
        expect.objectContaining({ q: VALID_ISBN_13, page: 1, limit: 20 })
      );
    });

    it('performs text search with cleaned query', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchBooks.mockResolvedValue(createSearchResult());

      await manager.smartSearch('  gatsby  ');

      expect(api.searchBooks).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'gatsby', page: 1, limit: 20 })
      );
    });

    it('passes active filters even when query is empty', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchBooks.mockResolvedValue(createSearchResult({ books: [], total: 0 }));

      await manager.smartSearch('   ', { status: 'reading' });

      expect(api.searchBooks).toHaveBeenCalledWith(
        expect.objectContaining({ q: '', status: 'reading', page: 1, limit: 20 })
      );
    });
  });

  describe('searchByISBN', () => {
    it('rejects invalid ISBNs', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      await expect(manager.searchByISBN('123')).rejects.toThrow(
        'Invalid ISBN format: 123. Please enter a valid 10 or 13 digit ISBN.'
      );
      expect(api.searchBooks).not.toHaveBeenCalled();
    });

    it('searches with normalized ISBN', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchBooks.mockResolvedValue(createSearchResult());

      await manager.searchByISBN(VALID_ISBN_13_WITH_DASHES);

      expect(api.searchBooks).toHaveBeenCalledWith(
        expect.objectContaining({ q: VALID_ISBN_13, page: 1, limit: 20 })
      );
    });
  });

  describe('advancedSearch', () => {
    it('builds a combined query and applies filters', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchBooks.mockResolvedValue(createSearchResult());

      await manager.advancedSearch({
        title: '  The Hobbit ',
        author: ' Tolkien',
        isbn: VALID_ISBN_13_WITH_DASHES,
        category: 10,
        status: 'paused',
      });

      expect(api.searchBooks).toHaveBeenCalledWith({
        q: `The Hobbit Tolkien ${VALID_ISBN_13}`,
        page: 1,
        limit: 20,
        categoryId: 10,
        status: 'paused',
      });
    });

    it('rejects invalid ISBN criteria', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      await expect(manager.advancedSearch({ isbn: 'bad' })).rejects.toThrow(
        'Invalid ISBN format: bad'
      );
      expect(api.searchBooks).not.toHaveBeenCalled();
    });
  });

  describe('getSearchSuggestions', () => {
    it('returns empty suggestions for queries shorter than 2 characters', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      const result = await manager.getSearchSuggestions('a');

      expect(result).toEqual({ authors: [], categories: [], isISBN: false });
      expect(api.searchAuthors).not.toHaveBeenCalled();
      expect(api.getCategories).not.toHaveBeenCalled();
    });

    it('limits authors and categories to 5 items and filters categories by query', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      const authors: Author[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Name${i}`,
        surname: `Surname${i}`,
        nationality: null,
      }));

      const categories: Category[] = [
        { id: 1, name: 'Classic' },
        { id: 2, name: 'Science Fiction' },
        { id: 3, name: 'Fiction' },
        { id: 4, name: 'Non-Fiction' },
        { id: 5, name: 'Biography' },
        { id: 6, name: 'Fi' },
      ];

      api.searchAuthors.mockResolvedValue(authors);
      api.getCategories.mockResolvedValue(categories);

      const result = await manager.getSearchSuggestions('fi');

      expect(result.authors).toHaveLength(5);
      expect(result.categories).toHaveLength(4);
      expect(result.categories.map(c => c.name)).toEqual([
        'Science Fiction',
        'Fiction',
        'Non-Fiction',
        'Fi',
      ]);
      expect(result.isISBN).toBe(false);
    });

    it('treats a 10/13-digit query as ISBN-like', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchAuthors.mockResolvedValue([]);
      api.getCategories.mockResolvedValue([]);

      const result = await manager.getSearchSuggestions(VALID_ISBN_13_WITH_DASHES);

      expect(result.isISBN).toBe(true);
    });

    it('handles API errors by returning empty arrays', async () => {
      const { api } = createMocks();
      const manager = new SearchManager(api);

      api.searchAuthors.mockRejectedValue(new Error('Author API down'));
      api.getCategories.mockRejectedValue(new Error('Categories API down'));

      const result = await manager.getSearchSuggestions('fi');

      expect(result).toEqual({ authors: [], categories: [], isISBN: false });
    });
  });

  describe('static helpers', () => {
    it('filters books by status', () => {
      const books: Book[] = [
        createBook({ id: 1, status: 'reading' }),
        createBook({ id: 2, status: 'finished' }),
      ];

      expect(SearchManager.filterBooksByStatus(books, 'finished').map(b => b.id)).toEqual(
        [2]
      );
    });

    it('sorts books by title, author, date-added, and status', () => {
      const books: Book[] = [
        createBook({
          id: 1,
          title: 'B Title',
          status: 'paused',
          creationDate: '2025-01-01T00:00:00.000Z',
          authors: [{ id: 1, name: 'George', surname: 'Orwell' }],
        }),
        createBook({
          id: 2,
          title: 'A Title',
          status: 'reading',
          creationDate: '2025-02-01T00:00:00.000Z',
          authors: [{ id: 2, name: 'Jane', surname: 'Austen' }],
        }),
        createBook({
          id: 3,
          title: 'C Title',
          status: 'finished',
          creationDate: '2024-01-01T00:00:00.000Z',
          authors: [{ id: 3, name: 'Harper', surname: 'Lee' }],
        }),
      ];

      expect(SearchManager.sortBooks(books, 'title').map(b => b.id)).toEqual([2, 1, 3]);
      expect(SearchManager.sortBooks(books, 'author').map(b => b.id)).toEqual([2, 3, 1]);
      expect(SearchManager.sortBooks(books, 'date-added').map(b => b.id)).toEqual([2, 1, 3]);
      expect(SearchManager.sortBooks(books, 'status').map(b => b.id)).toEqual([2, 1, 3]);
    });
  });
});

