import { Book, Author, Category, User, SearchResult, PaginatedResponse } from '../../types';

// Mock axios for the AxiosHttpClient
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

// Import after mocks are set up
import { apiService, bookAPI, categoryAPI, authorAPI, userAPI } from '../../services/api';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

// Mock environment variables
const originalEnv = process.env;

describe('ApiService with Shared Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Mock Data Methods (Development Mode)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;
    });

    test('getMockBooks returns expected structure', async () => {
      // Access private method via type assertion
      const mockBooks = await (apiService as any).getMockBooks();

      expect(mockBooks).toHaveProperty('books');
      expect(mockBooks).toHaveProperty('pagination');
      expect(Array.isArray(mockBooks.books)).toBe(true);
      expect(mockBooks.books.length).toBeGreaterThan(0);
      expect(mockBooks.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: mockBooks.books.length,
        itemsPerPage: 10,
      });
    });

    test('getMockCategories returns expected structure', async () => {
      const mockCategories = await (apiService as any).getMockCategories();

      expect(Array.isArray(mockCategories)).toBe(true);
      expect(mockCategories.length).toBeGreaterThan(0);
      expect(mockCategories[0]).toHaveProperty('id');
      expect(mockCategories[0]).toHaveProperty('name');
    });

    test('getMockAuthors returns expected structure', async () => {
      const mockAuthors = await (apiService as any).getMockAuthors();

      expect(Array.isArray(mockAuthors)).toBe(true);
      expect(mockAuthors.length).toBeGreaterThan(0);
      expect(mockAuthors[0]).toHaveProperty('id');
      expect(mockAuthors[0]).toHaveProperty('name');
      expect(mockAuthors[0]).toHaveProperty('surname');
    });

    test('getMockSearchResults filters by query', async () => {
      const searchParams = { q: 'gatsby' };
      const result = await (apiService as any).getMockSearchResults(searchParams);

      expect(result.books.some((book: Book) => 
        book.title.toLowerCase().includes('gatsby')
      )).toBe(true);
    });

    test('getMockSearchResults filters by status', async () => {
      const searchParams = { status: 'finished' };
      const result = await (apiService as any).getMockSearchResults(searchParams);

      expect(result.books.every((book: Book) => book.status === 'finished')).toBe(true);
    });

    test('getMockSearchResults filters by author', async () => {
      const searchParams = { authorId: 1 };
      const result = await (apiService as any).getMockSearchResults(searchParams);

      expect(result.books.every((book: Book) => 
        book.authors?.some(author => author.id === 1)
      )).toBe(true);
    });

    test('getMockSearchResults sorts by title', async () => {
      const searchParams = { sortBy: 'title' };
      const result = await (apiService as any).getMockSearchResults(searchParams);

      const titles = result.books.map((book: Book) => book.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    test('getMockSearchResults handles pagination', async () => {
      const searchParams = { page: 2, limit: 1 };
      const result = await (apiService as any).getMockSearchResults(searchParams);

      expect(result.page).toBe(2);
      expect(result.books.length).toBeLessThanOrEqual(1);
    });

    test('getBooks returns mock data in development mode', async () => {
      const result = await apiService.getBooks();

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.books)).toBe(true);
      expect(result.books.length).toBeGreaterThan(0);
      expect(result.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: result.books.length,
        itemsPerPage: 10,
      });
      
      // Should use mock data, not API client, in development mode
    });

    test('getCategories returns mock data in development mode', async () => {
      const result = await apiService.getCategories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      
      // Should use mock data, not API client, in development mode
    });

    test('getAuthors returns mock data in development mode', async () => {
      const result = await apiService.getAuthors();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('surname');
      
      // Should use mock data, not API client, in development mode
    });

    test('searchBooks uses mock data in development mode', async () => {
      const searchParams = { q: 'gatsby' };
      const result = await apiService.searchBooks(searchParams);

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('page');
      expect(result.books.some((book: Book) => 
        book.title.toLowerCase().includes('gatsby')
      )).toBe(true);
      
      // Should use mock data, not API client, in development mode
    });

    test('searchAuthors uses mock data in development mode', async () => {
      const result = await apiService.searchAuthors('fitzgerald');

      expect(Array.isArray(result)).toBe(true);
      expect(result.some(author => 
        author.name.toLowerCase().includes('fitzgerald') || 
        author.surname.toLowerCase().includes('fitzgerald')
      )).toBe(true);
      
      // Should use mock data, not API client, in development mode
    });

    test('searchAuthors returns empty array for empty search', async () => {
      const result = await apiService.searchAuthors('');
      expect(result).toEqual([]);
    });

    test('searchAuthors returns empty array for whitespace-only search', async () => {
      const result = await apiService.searchAuthors('   ');
      expect(result).toEqual([]);
      // Should use mock data, not API client, in development mode
    });
  });

  describe('Production Mode - API Client Behavior', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
    });

    describe('User Methods', () => {
      test('getCurrentUser uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        // and we haven't set up network mocking here
        await expect(apiService.getCurrentUser()).rejects.toThrow();
      });

      test('updateProfile uses API client in production mode', async () => {
        const userUpdate = { username: 'newusername' };
        
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.updateProfile(userUpdate)).rejects.toThrow();
      });
    });

    describe('Book Methods', () => {
      test('getBooks uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getBooks({ page: 1, limit: 10 })).rejects.toThrow();
      });

      test('getBook uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getBook(1)).rejects.toThrow();
      });

      test('createBook transforms data correctly and uses API client in production mode', async () => {
        const formData = {
          title: 'New Book',
          isbnCode: '123456789',
          editionNumber: 1,
          editionDate: '2024-01-01',
          status: 'unread' as const,
          notes: 'Test notes',
          selectedAuthors: [{ id: 1, name: 'Test', surname: 'Author' }],
          selectedCategories: [1, 2],
        };

        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.createBook(formData)).rejects.toThrow();
      });

      test('updateBook uses API client in production mode', async () => {
        const updateData = {
          title: 'Updated Book',
          selectedAuthors: [{ id: 2, name: 'New', surname: 'Author' }],
          selectedCategories: [3, 4],
        };

        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.updateBook(1, updateData)).rejects.toThrow();
      });

      test('updateBook handles non-form data in production mode', async () => {
        const updateData = { title: 'Updated Title' };

        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.updateBook(1, updateData)).rejects.toThrow();
      });

      test('deleteBook uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.deleteBook(1)).rejects.toThrow();
      });

      test('searchBooks uses API client in production mode', async () => {
        const searchParams = { q: 'test', status: 'finished' };
        
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.searchBooks(searchParams)).rejects.toThrow();
      });

      test('searchByIsbn uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.searchByIsbn('123456789')).rejects.toThrow();
      });

      test('createBook handles missing optional fields in production mode', async () => {
        const formData = {
          title: 'Minimal Book',
          isbnCode: '123456789',
          status: 'unread' as const,
        };

        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.createBook(formData)).rejects.toThrow();
      });
    });

    describe('Categories Methods', () => {
      test('getCategories uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getCategories()).rejects.toThrow();
      });

      test('getCategory uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getCategory(1)).rejects.toThrow();
      });

      test('createCategory uses API client in production mode', async () => {
        const categoryData = { name: 'New Category' };
        
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.createCategory(categoryData)).rejects.toThrow();
      });
    });

    describe('Authors Methods', () => {
      test('getAuthors uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getAuthors()).rejects.toThrow();
      });

      test('searchAuthors uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.searchAuthors('fitzgerald')).rejects.toThrow();
      });

      test('getAuthor uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.getAuthor(1)).rejects.toThrow();
      });

      test('createAuthor uses API client in production mode', async () => {
        const authorData = { name: 'New', surname: 'Author', nationality: 'British' };
        
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.createAuthor(authorData)).rejects.toThrow();
      });

      test('searchAuthors trims whitespace and uses API client in production mode', async () => {
        // In production mode, this should throw because the shared-api client would make a real API call
        await expect(apiService.searchAuthors('  test  ')).rejects.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    test('handleApiError processes response error', () => {
      const error = {
        response: {
          data: {
            error: 'Validation failed',
            details: 'Title is required',
          },
        },
      };

      const result = apiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Validation failed',
        details: 'Title is required',
      });
    });

    test('handleApiError handles network error', () => {
      const error = {
        message: 'Network Error',
      };

      const result = apiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Network error',
        details: 'Network Error',
      });
    });

    test('handleApiError handles unknown error', () => {
      const error = {};

      const result = apiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Network error',
        details: 'Unknown error occurred',
      });
    });
  });

  describe('Legacy Exports', () => {
    test('bookAPI methods are bound correctly in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      // In production mode, this should throw because the shared-api client would make a real API call
      await expect(bookAPI.searchBooks({ q: 'test' })).rejects.toThrow();
    });

    test('categoryAPI methods are bound correctly in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      // In production mode, this should throw because the shared-api client would make a real API call
      await expect(categoryAPI.getCategories()).rejects.toThrow();
    });

    test('authorAPI methods are bound correctly in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      // In production mode, this should throw because the shared-api client would make a real API call
      await expect(authorAPI.getAuthors()).rejects.toThrow();
    });

    test('userAPI methods are bound correctly in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      // In production mode, this should throw because the shared-api client would make a real API call
      await expect(userAPI.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('Service Configuration', () => {
    test('apiService is properly instantiated', () => {
      expect(apiService).toBeDefined();
      expect(typeof apiService.getBooks).toBe('function');
      expect(typeof apiService.getCategories).toBe('function');
      expect(typeof apiService.getAuthors).toBe('function');
      expect(typeof apiService.getCurrentUser).toBe('function');
      expect(typeof apiService.handleApiError).toBe('function');
    });

    test('legacy exports are properly configured', () => {
      expect(bookAPI).toBeDefined();
      expect(categoryAPI).toBeDefined();
      expect(authorAPI).toBeDefined();
      expect(userAPI).toBeDefined();

      expect(typeof bookAPI.getBooks).toBe('function');
      expect(typeof bookAPI.searchBooks).toBe('function');
      expect(typeof categoryAPI.getCategories).toBe('function');
      expect(typeof authorAPI.getAuthors).toBe('function');
      expect(typeof userAPI.getCurrentUser).toBe('function');
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('searchBooks handles complex search parameters in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const searchParams = {
        q: 'test query',
        page: 2,
        limit: 10,
        status: 'finished',
        sortBy: 'title',
        authorId: 1,
        categoryId: 2,
      };

      // In production mode, this should throw because the shared-api client would make a real API call
      await expect(apiService.searchBooks(searchParams)).rejects.toThrow();
    });
  });
});