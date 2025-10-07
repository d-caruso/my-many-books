/**
 * API Service tests using MSW for HTTP layer mocking
 * Industry standard approach - mocks at the HTTP layer instead of API client layer
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { Book, Category, Author, User, PaginatedResponse } from '../../types';
import { createApiService } from '../../services/api';
import type { HttpClient, RequestConfig } from '@my-many-books/shared-api';

// Create a clean HttpClient for testing with MSW using fetch
class TestHttpClient implements HttpClient {
  constructor(private baseURL: string = 'http://localhost:3000/api') {}

  private getFullUrl(url: string, params?: Record<string, any>): string {
    // If URL is already absolute, use it; otherwise prepend baseURL
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const cleanBase = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL;
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${cleanBase}${cleanUrl}`;
    }

    // Append query params if provided
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      fullUrl = `${fullUrl}?${queryString}`;
    }

    return fullUrl;
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.getFullUrl(url, config?.params), {
      method: 'GET',
      headers: config?.headers as any,
    });
    return response.json();
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.getFullUrl(url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      } as any,
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.getFullUrl(url), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      } as any,
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await fetch(this.getFullUrl(url), {
      method: 'DELETE',
      headers: config?.headers as any,
    });
    return response.json();
  }
}

// Create API service with test HTTP client and explicit baseURL
const apiService = createApiService({
  httpClient: new TestHttpClient(),
  config: {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    getAuthToken: () => null,
    onUnauthorized: () => {},
  },
});

const bookAPI = {
  searchBooks: apiService.searchBooks.bind(apiService),
  searchByISBN: apiService.searchByISBN.bind(apiService),
  getBooks: apiService.getBooks.bind(apiService),
  getBook: apiService.getBook.bind(apiService),
  createBook: apiService.createBook.bind(apiService),
  updateBook: apiService.updateBook.bind(apiService),
  deleteBook: apiService.deleteBook.bind(apiService),
};

const categoryAPI = {
  getCategories: apiService.getCategories.bind(apiService),
  getCategory: apiService.getCategory.bind(apiService),
  createCategory: apiService.createCategory.bind(apiService),
};

const authorAPI = {
  getAuthors: apiService.getAuthors.bind(apiService),
  searchAuthors: apiService.searchAuthors.bind(apiService),
  getAuthor: apiService.getAuthor.bind(apiService),
  createAuthor: apiService.createAuthor.bind(apiService),
};

const userAPI = {
  getCurrentUser: apiService.getCurrentUser.bind(apiService),
  updateProfile: apiService.updateProfile.bind(apiService),
};

describe('API Service with MSW HTTP Layer Mocking', () => {
  beforeEach(() => {
    // Reset any custom handlers before each test
    server.resetHandlers();
  });

  describe('Books API', () => {
    test('getBooks makes HTTP request and returns data', async () => {
      const result = await bookAPI.getBooks({ page: 1, limit: 10 });

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.books)).toBe(true);
      expect(result.books.length).toBeGreaterThan(0);
      expect(result.books[0]).toHaveProperty('title');
      expect(result.books[0]).toHaveProperty('isbnCode');
    });

    test('getBooks with custom pagination parameters', async () => {
      // Override the default handler with specific expectations
      server.use(
        http.get('*/api/books', ({ request }) => {
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const limit = url.searchParams.get('limit');

          // Verify the correct parameters were sent
          expect(page).toBe('2');
          expect(limit).toBe('5');

          const response: PaginatedResponse<Book> = {
            books: [],
            pagination: {
              currentPage: 2,
              totalPages: 3,
              totalItems: 15,
              itemsPerPage: 5
            }
          };

          return HttpResponse.json(response);
        })
      );

      const result = await bookAPI.getBooks({ page: 2, limit: 5 });

      // Check if result exists and has the expected structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('currentPage');
      expect(result.pagination.currentPage).toBe(2);
      expect(result.pagination.itemsPerPage).toBe(5);
    });

    test('createBook makes HTTP POST request with correct data', async () => {
      const bookData = {
        title: 'Test Book',
        isbnCode: '123456789',
        editionNumber: 1,
        editionDate: '2024-01-01',
        status: 'unread' as const,
        notes: 'Test notes',
        selectedAuthors: [{ id: 1, name: 'Test', surname: 'Author' }],
        selectedCategories: [1, 2],
      };

      // Override handler to verify request data
      server.use(
        http.post('*/api/books', async ({ request }) => {
          const body = await request.json() as any;

          // Verify the transformed data structure
          expect(body).toEqual({
            title: 'Test Book',
            isbnCode: '123456789',
            editionNumber: 1,
            editionDate: '2024-01-01',
            status: 'unread',
            notes: 'Test notes',
            authorIds: [1],
            categoryIds: [1, 2],
          });

          const newBook: Book = {
            id: 123,
            ...body,
            userId: 1,
            authors: [],
            categories: [],
            creationDate: new Date().toISOString(),
            updateDate: new Date().toISOString()
          };

          return HttpResponse.json(newBook);
        })
      );

      const result = await bookAPI.createBook(bookData);

      expect(result.id).toBe(123);
      expect(result.title).toBe('Test Book');
    });

    test('handles API errors correctly', async () => {
      // Mock a 404 error
      server.use(
        http.get('*/api/books/999', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      await expect(bookAPI.getBook(999)).rejects.toThrow();
    });
  });

  describe('Categories API', () => {
    test('getCategories makes HTTP request and returns data', async () => {
      const result = await categoryAPI.getCategories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    test('createCategory makes HTTP POST request', async () => {
      const categoryData = { name: 'Test Category' };

      server.use(
        http.post('*/api/categories', async ({ request }) => {
          const body = await request.json() as any;
          expect(body).toEqual(categoryData);

          const newCategory: Category = {
            id: 123,
            name: 'Test Category',
            creationDate: new Date().toISOString(),
            updateDate: new Date().toISOString()
          };

          return HttpResponse.json(newCategory);
        })
      );

      const result = await categoryAPI.createCategory(categoryData);

      expect(result.id).toBe(123);
      expect(result.name).toBe('Test Category');
    });
  });

  describe('Authors API', () => {
    test('searchAuthors makes HTTP request with search parameter', async () => {
      server.use(
        http.get('*/api/authors/search', ({ request }) => {
          const url = new URL(request.url);
          const q = url.searchParams.get('q');
          expect(q).toBe('fitzgerald');

          const filteredAuthors: Author[] = [
            {
              id: 1,
              name: 'F. Scott',
              surname: 'Fitzgerald',
              nationality: 'American',
              creationDate: '2024-01-01T00:00:00Z',
              updateDate: '2024-01-01T00:00:00Z'
            }
          ];

          return HttpResponse.json(filteredAuthors);
        })
      );

      const result = await authorAPI.searchAuthors('fitzgerald');

      // Check if result exists and is an array
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(1);
        expect(result[0].surname).toBe('Fitzgerald');
      }
    });
  });

  describe('Users API', () => {
    test('getCurrentUser makes HTTP request and returns user data', async () => {
      const result = await userAPI.getCurrentUser();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
    });

    test('updateProfile makes HTTP PUT request with user data', async () => {
      const updateData = { username: 'newusername' };

      server.use(
        http.put('*/api/users', async ({ request }) => {
          const body = await request.json() as any;
          expect(body).toEqual(updateData);

          const updatedUser: User = {
            id: 1,
            username: 'newusername',
            email: 'test@example.com'
          };

          return HttpResponse.json(updatedUser);
        })
      );

      const result = await userAPI.updateProfile(updateData);

      expect(result.username).toBe('newusername');
    });
  });

  describe('Search Functionality', () => {
    test('searchBooks makes HTTP request with search parameters', async () => {
      const searchParams = {
        q: 'gatsby',
        status: 'finished',
        page: 1,
        limit: 5
      };

      server.use(
        http.get('*/api/books/search', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('q')).toBe('gatsby');

          const searchResult = {
            books: [
              {
                id: 1,
                title: 'The Great Gatsby',
                isbnCode: '9780743273565',
                status: 'finished',
                userId: 1,
                authors: [],
                categories: [],
                creationDate: '2024-01-15T10:00:00Z',
                updateDate: '2024-01-15T10:00:00Z'
              }
            ],
            total: 1,
            hasMore: false,
            page: 1
          };

          return HttpResponse.json(searchResult);
        })
      );

      const result = await bookAPI.searchBooks(searchParams);

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('page');
      expect(result.books.length).toBe(1);
      expect(result.books[0].title).toContain('Gatsby');
    });

    test('searchByISBN makes HTTP request to ISBN endpoint', async () => {
      const isbn = '9780743273565';

      server.use(
        http.get(`*/api/books/search/${isbn}`, () => {
          // ISBN is part of the path, not a param

          return HttpResponse.json({
            title: 'The Great Gatsby',
            isbn: isbn
          });
        })
      );

      const result = await bookAPI.searchByISBN(isbn);

      expect(result.title).toBe('The Great Gatsby');
      expect(result.isbn).toBe(isbn);
    });
  });
});