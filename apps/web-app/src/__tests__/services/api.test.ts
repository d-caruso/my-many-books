import { Book, Author, Category, User, SearchResult, PaginatedResponse } from '../../types';

// Mock the shared-api library using industry standard approach
vi.mock('@my-many-books/shared-api', () => ({
  createApiClient: vi.fn(() => ({
    books: {
      getBooks: vi.fn(),
      getBook: vi.fn(),
      createBook: vi.fn(),
      updateBook: vi.fn(),
      deleteBook: vi.fn(),
      searchBooks: vi.fn(),
      searchByISBN: vi.fn(),
    },
    categories: {
      getCategories: vi.fn(),
      getCategory: vi.fn(),
      createCategory: vi.fn(),
    },
    authors: {
      getAuthors: vi.fn(),
      getAuthor: vi.fn(),
      createAuthor: vi.fn(),
      searchAuthors: vi.fn(),
    },
    users: {
      getCurrentUser: vi.fn(),
      updateProfile: vi.fn(),
    },
  })),
  createMockApiClient: () => ({
    books: {
      getBooks: vi.fn(),
      getBook: vi.fn(),
      createBook: vi.fn(),
      updateBook: vi.fn(),
      deleteBook: vi.fn(),
      searchBooks: vi.fn(),
      searchByISBN: vi.fn(),
    },
    categories: {
      getCategories: vi.fn(),
      getCategory: vi.fn(),
      createCategory: vi.fn(),
    },
    authors: {
      getAuthors: vi.fn(),
      getAuthor: vi.fn(),
      createAuthor: vi.fn(),
      searchAuthors: vi.fn(),
    },
    users: {
      getCurrentUser: vi.fn(),
      updateProfile: vi.fn(),
    },
  }),
  resetApiClientMocks: vi.fn(),
}));

// Mock axios for the AxiosHttpClient
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Import after mocks are set up (avoid importing default instance to prevent axios creation)
import { createApiService, ApiService } from '../../services/api';
import { createApiClient, createMockApiClient } from '@my-many-books/shared-api';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
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

describe('ApiService with Industry Standard Testing', () => {
  let mockApiClient: ReturnType<typeof createMockApiClient>;
  let testApiService: ApiService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    process.env = { ...originalEnv };

    // Create a fresh mock API client for each test
    mockApiClient = createMockApiClient();
    
    // ALWAYS use dependency injection with mock to avoid axios creation
    testApiService = createApiService({ apiClient: mockApiClient });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Mock Data Methods (Development Mode)', () => {
    beforeEach(() => {
      // Mock import.meta.env using Vitest's env stubbing
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('VITE_API_BASE_URL', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test('getMockBooks returns expected structure', async () => {
      // Access private method via type assertion
      const mockBooks = await (testApiService as any).getMockBooks();

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
      const mockCategories = await (testApiService as any).getMockCategories();

      expect(Array.isArray(mockCategories)).toBe(true);
      expect(mockCategories.length).toBeGreaterThan(0);
      expect(mockCategories[0]).toHaveProperty('id');
      expect(mockCategories[0]).toHaveProperty('name');
    });

    test('getMockAuthors returns expected structure', async () => {
      const mockAuthors = await (testApiService as any).getMockAuthors();

      expect(Array.isArray(mockAuthors)).toBe(true);
      expect(mockAuthors.length).toBeGreaterThan(0);
      expect(mockAuthors[0]).toHaveProperty('id');
      expect(mockAuthors[0]).toHaveProperty('name');
      expect(mockAuthors[0]).toHaveProperty('surname');
    });

    test('getMockSearchResults filters by query', async () => {
      const searchParams = { q: 'gatsby' };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      expect(result.books.some((book: Book) => 
        book.title.toLowerCase().includes('gatsby')
      )).toBe(true);
    });

    test('getMockSearchResults filters by status', async () => {
      const searchParams = { status: 'finished' };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      expect(result.books.every((book: Book) => book.status === 'finished')).toBe(true);
    });

    test('getMockSearchResults filters by author', async () => {
      const searchParams = { authorId: 1 };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      expect(result.books.every((book: Book) => 
        book.authors?.some(author => author.id === 1)
      )).toBe(true);
    });

    test('getMockSearchResults sorts by title', async () => {
      const searchParams = { sortBy: 'title' };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      const titles = result.books.map((book: Book) => book.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    test('getMockSearchResults sorts by author', async () => {
      const searchParams = { sortBy: 'author' };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      const authors = result.books.map((book: Book) => 
        book.authors?.[0] ? `${book.authors[0].name} ${book.authors[0].surname}` : ''
      );
      const sortedAuthors = [...authors].sort();
      expect(authors).toEqual(sortedAuthors);
    });

    test('getMockSearchResults sorts by date-added', async () => {
      const searchParams = { sortBy: 'date-added' };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      // Should be sorted by creation date descending (newest first)
      const dates = result.books.map((book: Book) => new Date(book.creationDate).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    test('getMockSearchResults filters by categoryId', async () => {
      const searchParams = { categoryId: 1 };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      expect(result.books.every((book: Book) => 
        book.categories?.some(category => category.id === 1)
      )).toBe(true);
    });

    test('getMockSearchResults handles pagination', async () => {
      const searchParams = { page: 2, limit: 1 };
      const result = await (testApiService as any).getMockSearchResults(searchParams);

      expect(result.page).toBe(2);
      expect(result.books.length).toBeLessThanOrEqual(1);
    });

    test('getBooks returns mock data in development mode', async () => {
      const result = await testApiService.getBooks();

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
      const result = await testApiService.getCategories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      
      // Should use mock data, not API client, in development mode
    });

    test('getAuthors returns mock data in development mode', async () => {
      const result = await testApiService.getAuthors();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('surname');
      
      // Should use mock data, not API client, in development mode
    });

    test('searchBooks uses mock data in development mode', async () => {
      const searchParams = { q: 'gatsby' };
      const result = await testApiService.searchBooks(searchParams);

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
      const result = await testApiService.searchAuthors('fitzgerald');

      expect(Array.isArray(result)).toBe(true);
      expect(result.some(author => 
        author.name.toLowerCase().includes('fitzgerald') || 
        author.surname.toLowerCase().includes('fitzgerald')
      )).toBe(true);
      
      // Should use mock data, not API client, in development mode
    });

    test('searchAuthors returns empty array for empty search', async () => {
      const result = await testApiService.searchAuthors('');
      expect(result).toEqual([]);
    });

    test('searchAuthors returns empty array for whitespace-only search', async () => {
      const result = await testApiService.searchAuthors('   ');
      expect(result).toEqual([]);
      // Should use mock data, not API client, in development mode
    });
  });

  describe('Production Mode - Industry Standard API Client Testing', () => {
    beforeEach(() => {
      // Mock import.meta.env for production with API URL
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    describe('User Methods', () => {
      test('getCurrentUser delegates to API client with correct parameters', async () => {
        const mockUser: User = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        };
        mockApiClient.users.getCurrentUser.mockResolvedValue(mockUser);

        const result = await testApiService.getCurrentUser();

        expect(mockApiClient.users.getCurrentUser).toHaveBeenCalledWith();
        expect(mockApiClient.users.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockUser);
      });

      test('updateProfile delegates to API client with correct parameters', async () => {
        const userUpdate = { username: 'newusername' };
        const mockUpdatedUser: User = {
          id: 1,
          username: 'newusername',
          email: 'test@example.com',
        };
        mockApiClient.users.updateProfile.mockResolvedValue(mockUpdatedUser);

        const result = await testApiService.updateProfile(userUpdate);

        expect(mockApiClient.users.updateProfile).toHaveBeenCalledWith(userUpdate);
        expect(mockApiClient.users.updateProfile).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockUpdatedUser);
      });
    });

    describe('Book Methods', () => {
      test('getBooks delegates to API client with correct parameters', async () => {
        const mockResponse: PaginatedResponse<Book> = {
          books: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: 10,
          },
        };
        mockApiClient.books.getBooks.mockResolvedValue(mockResponse);

        const result = await testApiService.getBooks({ page: 1, limit: 10 });

        expect(mockApiClient.books.getBooks).toHaveBeenCalledWith(1, 10);
        expect(mockApiClient.books.getBooks).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      test('createBook transforms form data and delegates to API client', async () => {
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

        const mockResponse: Book = {
          id: 1,
          title: 'New Book',
          isbnCode: '123456789',
          status: 'unread',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.books.createBook.mockResolvedValue(mockResponse);

        const result = await testApiService.createBook(formData);

        expect(mockApiClient.books.createBook).toHaveBeenCalledWith({
          title: 'New Book',
          isbnCode: '123456789',
          editionNumber: 1,
          editionDate: '2024-01-01',
          status: 'unread',
          notes: 'Test notes',
          authorIds: [1],
          categoryIds: [1, 2],
        });
        expect(mockApiClient.books.createBook).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      test('searchBooks delegates to API client with correct parameters in production mode', async () => {
        const mockResult = { books: [], total: 0, hasMore: false, page: 1 };
        mockApiClient.books.searchBooks.mockResolvedValue(mockResult);

        const searchParams = { q: 'test', status: 'finished' };
        const result = await testApiService.searchBooks(searchParams);

        expect(mockApiClient.books.searchBooks).toHaveBeenCalledWith({
          query: 'test',
          status: 'finished',
          sortBy: undefined,
          authorId: undefined,
          categoryId: undefined,
          page: undefined,
          limit: undefined,
        });
        expect(mockApiClient.books.searchBooks).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResult);
      });

      test('getBook delegates to API client with correct parameters', async () => {
        const mockBook: Book = {
          id: 1,
          title: 'Test Book',
          isbnCode: '123456789',
          status: 'unread',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z'
        };
        mockApiClient.books.getBook.mockResolvedValue(mockBook);

        const result = await testApiService.getBook(1);

        expect(mockApiClient.books.getBook).toHaveBeenCalledWith(1);
        expect(mockApiClient.books.getBook).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockBook);
      });

      test('updateBook transforms form data and delegates to API client', async () => {
        const updateData = {
          title: 'Updated Book',
          selectedAuthors: [{ id: 1, name: 'Test', surname: 'Author' }],
          selectedCategories: [1, 2],
        };

        const mockResponse: Book = {
          id: 1,
          title: 'Updated Book',
          isbnCode: '123456789',
          status: 'unread',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z'
        };
        mockApiClient.books.updateBook.mockResolvedValue(mockResponse);

        const result = await testApiService.updateBook(1, updateData);

        expect(mockApiClient.books.updateBook).toHaveBeenCalledWith(1, {
          title: 'Updated Book',
          isbnCode: undefined,
          editionNumber: undefined,
          editionDate: undefined,
          status: undefined,
          notes: undefined,
          authorIds: [1],
          categoryIds: [1, 2],
        });
        expect(mockApiClient.books.updateBook).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResponse);
      });

      test('updateBook with partial data without form fields', async () => {
        const updateData = { title: 'Updated Title' };
        const mockResponse: Book = {
          id: 1,
          title: 'Updated Title',
          isbnCode: '123456789',
          status: 'unread',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z'
        };
        mockApiClient.books.updateBook.mockResolvedValue(mockResponse);

        const result = await testApiService.updateBook(1, updateData);

        expect(mockApiClient.books.updateBook).toHaveBeenCalledWith(1, updateData);
        expect(result).toEqual(mockResponse);
      });

      test('deleteBook delegates to API client with correct parameters', async () => {
        mockApiClient.books.deleteBook.mockResolvedValue(undefined);

        await testApiService.deleteBook(1);

        expect(mockApiClient.books.deleteBook).toHaveBeenCalledWith(1);
        expect(mockApiClient.books.deleteBook).toHaveBeenCalledTimes(1);
      });

      test('searchByISBN delegates to API client with correct parameters', async () => {
        const isbn = '9780743273565';
        const mockResult = { title: 'Book Title', isbn };
        mockApiClient.books.searchByISBN.mockResolvedValue(mockResult);

        const result = await testApiService.searchByISBN(isbn);

        expect(mockApiClient.books.searchByISBN).toHaveBeenCalledWith(isbn);
        expect(mockApiClient.books.searchByISBN).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockResult);
      });
    });

    describe('Categories Methods', () => {
      test('getCategories delegates to API client with correct parameters', async () => {
        const mockCategories: Category[] = [
          { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
        ];
        mockApiClient.categories.getCategories.mockResolvedValue(mockCategories);

        const result = await testApiService.getCategories();

        expect(mockApiClient.categories.getCategories).toHaveBeenCalledWith();
        expect(mockApiClient.categories.getCategories).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockCategories);
      });

      test('getCategory delegates to API client with correct parameters', async () => {
        const mockCategory: Category = {
          id: 1,
          name: 'Fiction',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z'
        };
        mockApiClient.categories.getCategory.mockResolvedValue(mockCategory);

        const result = await testApiService.getCategory(1);

        expect(mockApiClient.categories.getCategory).toHaveBeenCalledWith(1);
        expect(mockApiClient.categories.getCategory).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockCategory);
      });

      test('createCategory delegates to API client with correct parameters', async () => {
        const categoryData = { name: 'New Category' };
        const mockCategory: Category = {
          id: 1,
          name: 'New Category',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z'
        };
        mockApiClient.categories.createCategory.mockResolvedValue(mockCategory);

        const result = await testApiService.createCategory(categoryData);

        expect(mockApiClient.categories.createCategory).toHaveBeenCalledWith(categoryData);
        expect(mockApiClient.categories.createCategory).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockCategory);
      });
    });

    describe('Authors Methods', () => {
      test('searchAuthors delegates to API client with correct parameters', async () => {
        const mockAuthors: Author[] = [
          { 
            id: 1, 
            name: 'F. Scott', 
            surname: 'Fitzgerald', 
            nationality: 'American',
            creationDate: '2024-01-01T00:00:00Z',
            updateDate: '2024-01-01T00:00:00Z',
          },
        ];
        mockApiClient.authors.searchAuthors.mockResolvedValue(mockAuthors);

        const result = await testApiService.searchAuthors('fitzgerald');

        expect(mockApiClient.authors.searchAuthors).toHaveBeenCalledWith('fitzgerald');
        expect(mockApiClient.authors.searchAuthors).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockAuthors);
      });

      test('getAuthors delegates to API client with correct parameters', async () => {
        const mockAuthors: Author[] = [
          { 
            id: 1, 
            name: 'F. Scott', 
            surname: 'Fitzgerald', 
            nationality: 'American',
            creationDate: '2024-01-01T00:00:00Z',
            updateDate: '2024-01-01T00:00:00Z',
          },
        ];
        mockApiClient.authors.getAuthors.mockResolvedValue(mockAuthors);

        const result = await testApiService.getAuthors();

        expect(mockApiClient.authors.getAuthors).toHaveBeenCalledWith();
        expect(mockApiClient.authors.getAuthors).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockAuthors);
      });

      test('getAuthor delegates to API client with correct parameters', async () => {
        const mockAuthor: Author = {
          id: 1,
          name: 'F. Scott',
          surname: 'Fitzgerald',
          nationality: 'American',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.authors.getAuthor.mockResolvedValue(mockAuthor);

        const result = await testApiService.getAuthor(1);

        expect(mockApiClient.authors.getAuthor).toHaveBeenCalledWith(1);
        expect(mockApiClient.authors.getAuthor).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockAuthor);
      });

      test('createAuthor delegates to API client with correct parameters', async () => {
        const authorData = { name: 'New', surname: 'Author', nationality: 'American' };
        const mockAuthor: Author = {
          id: 1,
          name: 'New',
          surname: 'Author',
          nationality: 'American',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.authors.createAuthor.mockResolvedValue(mockAuthor);

        const result = await testApiService.createAuthor(authorData);

        expect(mockApiClient.authors.createAuthor).toHaveBeenCalledWith(authorData);
        expect(mockApiClient.authors.createAuthor).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockAuthor);
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

      const result = testApiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Validation failed',
        details: 'Title is required',
      });
    });

    test('handleApiError handles network error', () => {
      const error = {
        message: 'Network Error',
      };

      const result = testApiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Network error',
        details: 'Network Error',
      });
    });

    test('handleApiError handles unknown error', () => {
      const error = {};

      const result = testApiService.handleApiError(error);

      expect(result).toEqual({
        error: 'Network error',
        details: 'Unknown error occurred',
      });
    });
  });

  describe('Service Configuration and Dependency Injection', () => {
    test('createApiService creates service with injected dependencies', () => {
      const customMockClient = createMockApiClient();
      const customApiService = createApiService({ apiClient: customMockClient });

      expect(customApiService).toBeInstanceOf(ApiService);
      expect(customApiService).toBeDefined();
    });

    test('testApiService uses injected mock API client', async () => {
      // Verify that our test service is using the injected mock
      const mockUser: User = { id: 1, username: 'test', email: 'test@example.com' };
      mockApiClient.users.getCurrentUser.mockResolvedValue(mockUser);

      const result = await testApiService.getCurrentUser();

      expect(mockApiClient.users.getCurrentUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    test('createApiService with custom httpClient and config', () => {
      const mockHttpClient = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };

      const customConfig = {
        baseURL: 'https://custom-api.com',
        timeout: 5000,
        getAuthToken: () => 'custom-token',
        onUnauthorized: vi.fn(),
      };

      const customApiService = createApiService({ 
        httpClient: mockHttpClient,
        config: customConfig 
      });

      expect(customApiService).toBeInstanceOf(ApiService);
      expect(customApiService).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('development mode uses mock data and does not call API client', async () => {
      // Mock import.meta.env for development mode
      vi.stubEnv('MODE', 'development');
      vi.stubEnv('VITE_API_BASE_URL', '');

      const result = await testApiService.getBooks();

      // Should return mock data
      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.books)).toBe(true);

      // Should not call the API client
      expect(mockApiClient.books.getBooks).not.toHaveBeenCalled();

      vi.unstubAllEnvs();
    });

    test('production mode calls API client with correct parameters', async () => {
      // Mock import.meta.env for production mode
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');

      const mockResponse = {
        books: [],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }
      };
      mockApiClient.books.getBooks.mockResolvedValue(mockResponse);

      const result = await testApiService.getBooks({ page: 2, limit: 5 });

      // Should call API client with correct parameters
      expect(mockApiClient.books.getBooks).toHaveBeenCalledWith(2, 5);
      expect(mockApiClient.books.getBooks).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);

      vi.unstubAllEnvs();
    });
  });
});