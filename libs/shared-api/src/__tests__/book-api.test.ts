import { BookApi } from '../book-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import {
  Book,
  BookFormData,
  BookStatus,
  PaginatedResponse,
  SearchFilters,
  SearchResult,
} from '@my-many-books/shared-types';

describe('BookApi', () => {
  let mockHttpClient: MockHttpClient;
  let bookApi: BookApi;

  const mockBook: Book = {
    id: 1,
    title: 'Test Book',
    description: 'A test book description',
    isbn: '978-0-123-45678-9',
    status: 'to-read',
    userId: 1,
    authors: [],
    categories: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockPaginatedResponse: PaginatedResponse<Book> = {
    data: [mockBook],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockSearchResult: SearchResult = {
    results: [mockBook],
    total: 1,
    query: 'test',
    filters: {},
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

  describe('getBooks', () => {
    it('should fetch paginated books with default parameters', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      const result = await bookApi.getBooks();

      expect(result).toEqual(mockPaginatedResponse);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/books');
      expect(lastRequest?.config?.params).toEqual({
        page: 1,
        limit: 10,
        includeAuthors: 'true',
        includeCategories: 'true',
      });
    });

    it('should fetch paginated books with custom page and limit', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      await bookApi.getBooks(2, 20);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.page).toBe(2);
      expect(lastRequest?.config?.params?.limit).toBe(20);
    });

    it('should exclude authors when includeAuthors is false', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      await bookApi.getBooks(1, 10, false);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.includeAuthors).toBe('false');
    });

    it('should exclude categories when includeCategories is false', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      await bookApi.getBooks(1, 10, true, false);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.includeCategories).toBe('false');
    });

    it('should validate response against PaginatedBooksSchema', async () => {
      const invalidResponse = { invalid: 'data' };
      mockHttpClient.setResponse('/books', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.getBooks()).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/books', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(bookApi.getBooks()).rejects.toThrow('HTTP Error 500');
    });
  });

  describe('getBook', () => {
    it('should fetch a single book by id', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: mockBook,
        status: 200,
      });

      const result = await bookApi.getBook(1);

      expect(result).toEqual(mockBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/books/1');
    });

    it('should validate response against BookSchema', async () => {
      const invalidBook = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books/1', {
        data: invalidBook,
        status: 200,
      });

      await expect(bookApi.getBook(1)).rejects.toThrow(ZodError);
    });

    it('should handle 404 errors', async () => {
      mockHttpClient.setResponse('/books/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(bookApi.getBook(999)).rejects.toThrow('HTTP Error 404');
    });
  });

  describe('createBook', () => {
    const newBookData: BookFormData = {
      title: 'New Book',
      description: 'A new book',
      isbn: '978-0-987-65432-1',
      status: 'to-read',
      authorIds: [1, 2],
      categoryIds: [1],
    };

    it('should create a new book', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockBook,
        status: 201,
      });

      const result = await bookApi.createBook(newBookData);

      expect(result).toEqual(mockBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('POST');
      expect(lastRequest?.url).toContain('/books');
      expect(lastRequest?.data).toEqual(newBookData);
    });

    it('should validate input data with BookFormSchema', async () => {
      const invalidData = { invalid: 'data' } as any;

      await expect(bookApi.createBook(invalidData)).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books', {
        data: invalidResponse,
        status: 201,
      });

      await expect(bookApi.createBook(newBookData)).rejects.toThrow(ZodError);
    });

    it('should handle validation errors from server', async () => {
      mockHttpClient.setResponse('/books', {
        data: { error: 'Validation failed' },
        status: 400,
      });

      await expect(bookApi.createBook(newBookData)).rejects.toThrow('HTTP Error 400');
    });
  });

  describe('updateBook', () => {
    const updateData: Partial<BookFormData> = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    it('should update a book with PUT method', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: { ...mockBook, ...updateData },
        status: 200,
      });

      const result = await bookApi.updateBook(1, updateData);

      expect(result.title).toBe('Updated Title');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PUT');
      expect(lastRequest?.url).toContain('/books/1');
      expect(lastRequest?.data).toEqual(updateData);
    });

    it('should validate input data with partial BookFormSchema', async () => {
      const invalidData = { status: 'invalid-status' } as any;

      await expect(bookApi.updateBook(1, invalidData)).rejects.toThrow(ZodError);
    });

    it('should handle empty update data', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: mockBook,
        status: 200,
      });

      const result = await bookApi.updateBook(1, {});

      expect(result).toEqual(mockBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.data).toEqual({});
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.updateBook(1, updateData)).rejects.toThrow(ZodError);
    });
  });

  describe('patchBook', () => {
    const patchData: Partial<BookFormData> = {
      description: 'Patched description',
    };

    it('should patch a book with PATCH method', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: { ...mockBook, ...patchData },
        status: 200,
      });

      const result = await bookApi.patchBook(1, patchData);

      expect(result.description).toBe('Patched description');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/books/1');
      expect(lastRequest?.data).toEqual(patchData);
    });

    it('should validate input data with partial BookFormSchema', async () => {
      const invalidData = { authorIds: 'not-an-array' } as any;

      await expect(bookApi.patchBook(1, invalidData)).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.patchBook(1, patchData)).rejects.toThrow(ZodError);
    });
  });

  describe('deleteBook', () => {
    it('should delete a book by id', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: undefined,
        status: 204,
      });

      await bookApi.deleteBook(1);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('DELETE');
      expect(lastRequest?.url).toContain('/books/1');
    });

    it('should handle 404 errors when book not found', async () => {
      mockHttpClient.setResponse('/books/999', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(bookApi.deleteBook(999)).rejects.toThrow('HTTP Error 404');
    });

    it('should handle 403 errors when unauthorized', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: { error: 'Forbidden' },
        status: 403,
      });

      await expect(bookApi.deleteBook(1)).rejects.toThrow('HTTP Error 403');
    });
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
        status: 'completed',
        authorId: 5,
        categoryId: 3,
        sortBy: 'createdAt',
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
      expect(url).toContain('status=completed');
      expect(url).toContain('authorId=5');
      expect(url).toContain('categoryId=3');
      expect(url).toContain('sortBy=createdAt');
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
      const invalidFilters = { status: 'invalid-status' } as any;

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
      mockHttpClient.setResponse('/books/search/978-0-123-45678-9', {
        data: mockBook,
        status: 200,
      });

      const result = await bookApi.searchByISBN('978-0-123-45678-9');

      expect(result).toEqual(mockBook);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/books/search/978-0-123-45678-9');
    });

    it('should return null when book not found (404)', async () => {
      mockHttpClient.setResponse('/books/search/999-9-999-99999-9', {
        data: { error: 'Not found' },
        status: 404,
      });

      const result = await bookApi.searchByISBN('999-9-999-99999-9');

      expect(result).toBeNull();
    });

    it('should validate response against BookSchema', async () => {
      const invalidBook = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books/search/978-0-123-45678-9', {
        data: invalidBook,
        status: 200,
      });

      await expect(bookApi.searchByISBN('978-0-123-45678-9')).rejects.toThrow(ZodError);
    });

    it('should propagate non-404 errors', async () => {
      mockHttpClient.setResponse('/books/search/978-0-123-45678-9', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(bookApi.searchByISBN('978-0-123-45678-9')).rejects.toThrow('HTTP Error 500');
    });
  });

  describe('updateBookStatus', () => {
    it('should update book status to reading', async () => {
      const updatedBook = { ...mockBook, status: 'reading' as BookStatus };
      mockHttpClient.setResponse('/books/1', {
        data: updatedBook,
        status: 200,
      });

      const result = await bookApi.updateBookStatus(1, 'reading');

      expect(result.status).toBe('reading');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/books/1');
      expect(lastRequest?.data).toEqual({ status: 'reading' });
    });

    it('should update book status to completed', async () => {
      const updatedBook = { ...mockBook, status: 'completed' as BookStatus };
      mockHttpClient.setResponse('/books/1', {
        data: updatedBook,
        status: 200,
      });

      const result = await bookApi.updateBookStatus(1, 'completed');

      expect(result.status).toBe('completed');
    });

    it('should validate status with BookStatusSchema', async () => {
      const invalidStatus = 'invalid-status' as any;

      await expect(bookApi.updateBookStatus(1, invalidStatus)).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, invalid: 'data' };
      mockHttpClient.setResponse('/books/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.updateBookStatus(1, 'reading')).rejects.toThrow(ZodError);
    });

    it('should handle all valid book statuses', async () => {
      const statuses: BookStatus[] = ['to-read', 'reading', 'completed', 'abandoned'];

      for (const status of statuses) {
        const updatedBook = { ...mockBook, status };
        mockHttpClient.setResponse(`/books/${mockBook.id}`, {
          data: updatedBook,
          status: 200,
        });

        const result = await bookApi.updateBookStatus(mockBook.id, status);
        expect(result.status).toBe(status);
      }
    });
  });
});
