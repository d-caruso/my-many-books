import { BookApi } from '../book-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { Book, BookFormData, PaginatedResponse } from '@my-many-books/shared-types';

describe('BookApi (CRUD)', () => {
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

  const mockPaginatedResponse: PaginatedResponse<Book> = {
    books: [mockBook],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      itemsPerPage: 10,
    },
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
        page: '1',
        limit: '10',
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
      expect(lastRequest?.config?.params?.['page']).toBe('2');
      expect(lastRequest?.config?.params?.['limit']).toBe('20');
    });

    it('should exclude authors when includeAuthors is false', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      await bookApi.getBooks(1, 10, false);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.['includeAuthors']).toBe('false');
    });

    it('should exclude categories when includeCategories is false', async () => {
      mockHttpClient.setResponse('/books', {
        data: mockPaginatedResponse,
        status: 200,
      });

      await bookApi.getBooks(1, 10, true, false);

      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.config?.params?.['includeCategories']).toBe('false');
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
      const invalidBook = { id: 1, isbnCode: '978-0-123-45678-9' };
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
      isbnCode: '978-0-987-65432-1',
      status: 'paused',
      notes: 'A new book note',
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
      const invalidData = { invalid: 'data' } as unknown as BookFormData;

      await expect(bookApi.createBook(invalidData)).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, title: 'Missing isbnCode' };
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

      await expect(bookApi.createBook(newBookData)).rejects.toThrow(
        'HTTP Error 400'
      );
    });
  });

  describe('updateBook', () => {
    const updateData: Partial<BookFormData> = {
      title: 'Updated Title',
      notes: 'Updated note',
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
      const invalidData = { status: 'invalid-status' } as unknown as Partial<BookFormData>;

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
      const invalidResponse = { id: 1, title: 'Missing isbnCode' };
      mockHttpClient.setResponse('/books/1', {
        data: invalidResponse,
        status: 200,
      });

      await expect(bookApi.updateBook(1, updateData)).rejects.toThrow(ZodError);
    });
  });

  describe('patchBook', () => {
    const patchData: Partial<BookFormData> = {
      notes: 'Patched note',
    };

    it('should patch a book with PATCH method', async () => {
      mockHttpClient.setResponse('/books/1', {
        data: { ...mockBook, ...patchData },
        status: 200,
      });

      const result = await bookApi.patchBook(1, patchData);

      expect(result.notes).toBe('Patched note');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/books/1');
      expect(lastRequest?.data).toEqual(patchData);
    });

    it('should validate input data with partial BookFormSchema', async () => {
      const invalidData = { authorIds: 'not-an-array' } as unknown as Partial<BookFormData>;

      await expect(bookApi.patchBook(1, invalidData)).rejects.toThrow(ZodError);
    });

    it('should validate response against BookSchema', async () => {
      const invalidResponse = { id: 1, title: 'Missing isbnCode' };
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
});
