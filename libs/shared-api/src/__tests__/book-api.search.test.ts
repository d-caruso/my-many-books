import { BookApi } from '../book-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { Book, BookStatus, SearchFilters, SearchResult } from '@my-many-books/shared-types';

describe('BookApi (Search & Status)', () => {
  let mockHttpClient: MockHttpClient;
  let bookApi: BookApi;

  const mockBook: Book = {
    id: 1,
    isbnCode: '978-0-123-45678-9',
    title: 'Test Book',
    status: 'reading',
    notes: 'A test book note',
    userId: 1,
    authors: [{ id: 1, name: 'John', surname: 'Doe' }],
    categories: [{ id: 1, name: 'Fiction' }],
    creationDate: '2024-01-01T00:00:00.000Z',
    updateDate: '2024-01-01T00:00:00.000Z',
  };

  const mockSearchResult: SearchResult = {
    books: [mockBook],
    total: 1,
    hasMore: false,
    page: 1,
  };

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    bookApi = new BookApi(mockHttpClient, {
      baseURL: 'https://api.example.com',
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('searchBooks', () => {
    it('should search books with query parameter', async () => {
      const filters: SearchFilters = { query: 'typescript' };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      const result = await bookApi.searchBooks(filters);

      expect(result).toEqual(mockSearchResult);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('q=typescript');
    });

    it('should search books with status filter', async () => {
      const filters: SearchFilters = { status: 'reading' };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('status=reading');
    });

    it('should search books with authorId filter', async () => {
      const filters: SearchFilters = { authorId: 42 };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('authorId=42');
    });

    it('should search books with categoryId filter', async () => {
      const filters: SearchFilters = { categoryId: 10 };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('categoryId=10');
    });

    it('should search books with sortBy parameter', async () => {
      const filters: SearchFilters = { sortBy: 'title' };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('sortBy=title');
    });

    it('should search books with pagination parameters', async () => {
      const filters: SearchFilters = { page: 2, limit: 20 };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('page=2');
      expect(lastRequest?.url).toContain('limit=20');
    });

    it('should search books with multiple filters combined', async () => {
      const filters: SearchFilters = {
        query: 'javascript',
        status: 'paused',
        authorId: 5,
        categoryId: 3,
        sortBy: 'author',
        page: 1,
        limit: 15,
      };
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks(filters);

      const lastRequest = mockHttpClient.getLastRequest();
      const url = lastRequest?.url || '';
      expect(url).toContain('q=javascript');
      expect(url).toContain('status=paused');
      expect(url).toContain('authorId=5');
      expect(url).toContain('categoryId=3');
      expect(url).toContain('sortBy=author');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=15');
    });

    it('should handle empty filters', async () => {
      mockHttpClient.setResponse('/books/search', {
        data: mockSearchResult,
        status: 200,
      });

      await bookApi.searchBooks({});

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.url).toContain('/books/search?');
    });

    it('should validate filters with SearchFiltersSchema', async () => {
      const invalidFilters = { query: 'x' } as any;

      await expect(bookApi.searchBooks(invalidFilters)).rejects.toThrow(ZodError);
    });

    it('should validate response against SearchResultSchema', async () => {
      const invalidResponse = { invalid: 'data' };
      mockHttpClient.setResponse('/books/search', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.searchBooks({ query: 'test' })).rejects.toThrow(ZodError);
    });
  });

  describe('searchByISBN', () => {
    it('should search for a book by ISBN', async () => {
      mockHttpClient.setResponse('/books/search/isbn/978-0-123-45678-9', {
        data: mockBook,
        status: 200,
      });

      const result = await bookApi.searchByISBN('978-0-123-45678-9');

      expect(result).toEqual(mockBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/books/search/isbn/978-0-123-45678-9');
    });

    it('should return null when book not found (404)', async () => {
      mockHttpClient.setResponse('/books/search/isbn/999-9-999-99999-9', {
        data: { error: 'Not found' },
        status: 404,
      });

      const result = await bookApi.searchByISBN('999-9-999-99999-9');

      expect(result).toBeNull();
    });

    it('should reject legacy wrapped ISBN search responses', async () => {
      mockHttpClient.setResponse('/books/search/isbn/978-0-123-45678-9', {
        data: { source: 'local', book: mockBook },
        status: 200,
      });

      await expect(bookApi.searchByISBN('978-0-123-45678-9')).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidBook = { id: 1, title: 'Missing isbnCode' };
      mockHttpClient.setResponse('/books/search/isbn/978-0-123-45678-9', {
        data: invalidBook,
        status: 200,
      });

      await expect(bookApi.searchByISBN('978-0-123-45678-9')).rejects.toThrow(
        ZodError
      );
    });

    it('should propagate non-404 errors', async () => {
      mockHttpClient.setResponse('/books/search/isbn/978-0-123-45678-9', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(bookApi.searchByISBN('978-0-123-45678-9')).rejects.toThrow(
        'HTTP Error 500'
      );
    });
  });

  describe('updateBookStatus', () => {
    it('should update book status via PATCH', async () => {
      const updatedBook: Book = { ...mockBook, status: 'finished' };
      mockHttpClient.setResponse('/books/1', {
        data: updatedBook,
        status: 200,
      });

      const result = await bookApi.updateBookStatus(1, 'finished');

      expect(result).toEqual(updatedBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/books/1');
      expect(lastRequest?.data).toEqual({ status: 'finished' });
    });

    it('should validate status with BookStatusSchema', async () => {
      await expect(bookApi.updateBookStatus(1, 'invalid-status' as any)).rejects.toThrow(
        ZodError
      );
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(bookApi.updateBookStatus(1, 'reading')).rejects.toThrow(
        'HTTP Error 403'
      );
    });

    it('should accept all valid BookStatus values', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: mockBook,
        status: 200,
      });

      const statuses: BookStatus[] = ['reading', 'paused', 'finished', null];

      for (const status of statuses) {
        await expect(bookApi.updateBookStatus(1, status)).resolves.toBeDefined();
      }
    });
  });
});
