/**
 * API Service tests using MSW for HTTP layer mocking
 * Industry standard approach - mocks at the HTTP layer instead of API client layer
 */

import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { createApiService } from '../../services/api';
import { Book, Category, Author, User, PaginatedResponse } from '../../types';

// Create API service with real implementation (no mocks)
const apiService = createApiService({
  config: {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    getAuthToken: () => 'test-token',
    onUnauthorized: () => {},
  }
});

describe('API Service with MSW HTTP Layer Mocking', () => {
  beforeEach(() => {
    // Reset any custom handlers before each test
    server.resetHandlers();
  });

  describe('Books API', () => {
    test('getBooks makes HTTP request and returns data', async () => {
      // Set environment to production to ensure API calls are made
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      try {
        const result = await apiService.getBooks({ page: 1, limit: 10 });

        expect(result).toHaveProperty('books');
        expect(result).toHaveProperty('pagination');
        expect(Array.isArray(result.books)).toBe(true);
        expect(result.books.length).toBeGreaterThan(0);
        expect(result.books[0]).toHaveProperty('title');
        expect(result.books[0]).toHaveProperty('isbnCode');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('getBooks with custom pagination parameters', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

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

      try {
        const result = await apiService.getBooks({ page: 2, limit: 5 });
        
        expect(result.pagination.currentPage).toBe(2);
        expect(result.pagination.itemsPerPage).toBe(5);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('createBook makes HTTP POST request with correct data', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

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

      try {
        const result = await apiService.createBook(bookData);
        
        expect(result.id).toBe(123);
        expect(result.title).toBe('Test Book');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('handles API errors correctly', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      // Mock a 404 error
      server.use(
        http.get('*/api/books/999', () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      try {
        await expect(apiService.getBook(999)).rejects.toThrow();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Categories API', () => {
    test('getCategories makes HTTP request and returns data', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      try {
        const result = await apiService.getCategories();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('createCategory makes HTTP POST request', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

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

      try {
        const result = await apiService.createCategory(categoryData);
        
        expect(result.id).toBe(123);
        expect(result.name).toBe('Test Category');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Authors API', () => {
    test('searchAuthors makes HTTP request with search parameter', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      server.use(
        http.get('*/api/authors', ({ request }) => {
          const url = new URL(request.url);
          const search = url.searchParams.get('search');
          expect(search).toBe('fitzgerald');
          
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

      try {
        const result = await apiService.searchAuthors('fitzgerald');
        
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0].surname).toBe('Fitzgerald');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Users API', () => {
    test('getCurrentUser makes HTTP request and returns user data', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      try {
        const result = await apiService.getCurrentUser();
        
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('username');
        expect(result).toHaveProperty('email');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('updateProfile makes HTTP PUT request with user data', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

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

      try {
        const result = await apiService.updateProfile(updateData);
        
        expect(result.username).toBe('newusername');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Search Functionality', () => {
    test('searchBooks makes HTTP request with search parameters', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      const searchParams = {
        q: 'gatsby',
        status: 'finished',
        page: 1,
        limit: 5
      };

      server.use(
        http.get('*/api/books', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('search')).toBe('gatsby');
          
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

      try {
        const result = await apiService.searchBooks(searchParams);
        
        expect(result).toHaveProperty('books');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('hasMore');
        expect(result).toHaveProperty('page');
        expect(result.books.length).toBe(1);
        expect(result.books[0].title).toContain('Gatsby');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('searchByISBN makes HTTP request to ISBN endpoint', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';

      const isbn = '9780743273565';

      server.use(
        http.get(`*/api/books/search/isbn/${isbn}`, ({ params }) => {
          expect(params.isbn).toBe(isbn);
          
          return HttpResponse.json({
            title: 'The Great Gatsby',
            isbn: isbn
          });
        })
      );

      try {
        const result = await apiService.searchByISBN(isbn);
        
        expect(result.title).toBe('The Great Gatsby');
        expect(result.isbn).toBe(isbn);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});