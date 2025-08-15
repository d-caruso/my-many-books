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

// Mock the shared-api library
const mockApiClient = {
  books: {
    getBooks: jest.fn(),
    getBook: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
    searchBooks: jest.fn(),
    searchByIsbn: jest.fn(),
  },
  authors: {
    getAuthors: jest.fn(),
    searchAuthors: jest.fn(),
    getAuthor: jest.fn(),
    createAuthor: jest.fn(),
  },
  categories: {
    getCategories: jest.fn(),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
  },
  users: {
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
  },
};

jest.mock('@my-many-books/shared-api', () => ({
  createApiClient: jest.fn(() => ({
    books: {
      getBooks: jest.fn(),
      getBook: jest.fn(),
      createBook: jest.fn(),
      updateBook: jest.fn(),
      deleteBook: jest.fn(),
      searchBooks: jest.fn(),
      searchByIsbn: jest.fn(),
    },
    authors: {
      getAuthors: jest.fn(),
      searchAuthors: jest.fn(),
      getAuthor: jest.fn(),
      createAuthor: jest.fn(),
    },
    categories: {
      getCategories: jest.fn(),
      getCategory: jest.fn(),
      createCategory: jest.fn(),
    },
    users: {
      getCurrentUser: jest.fn(),
      updateProfile: jest.fn(),
    },
  })),
}));

// Import after mocks are set up
import { apiService, bookAPI, categoryAPI, authorAPI, userAPI } from '../../services/api';
import { createApiClient } from '@my-many-books/shared-api';

// Get reference to the mocked createApiClient
const mockCreateApiClient = createApiClient as jest.MockedFunction<typeof createApiClient>;

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
  let mockApiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
    process.env = { ...originalEnv };
    
    // Get the mocked API client instance
    mockApiClient = mockCreateApiClient.mock.results[0]?.value || {
      books: {
        getBooks: jest.fn(),
        getBook: jest.fn(),
        createBook: jest.fn(),
        updateBook: jest.fn(),
        deleteBook: jest.fn(),
        searchBooks: jest.fn(),
        searchByIsbn: jest.fn(),
      },
      authors: {
        getAuthors: jest.fn(),
        searchAuthors: jest.fn(),
        getAuthor: jest.fn(),
        createAuthor: jest.fn(),
      },
      categories: {
        getCategories: jest.fn(),
        getCategory: jest.fn(),
        createCategory: jest.fn(),
      },
      users: {
        getCurrentUser: jest.fn(),
        updateProfile: jest.fn(),
      },
    };
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
      
      // Should not call the API client in development mode
      expect(mockApiClient.books.getBooks).not.toHaveBeenCalled();
    });

    test('getCategories returns mock data in development mode', async () => {
      const result = await apiService.getCategories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      
      // Should not call the API client in development mode
      expect(mockApiClient.categories.getCategories).not.toHaveBeenCalled();
    });

    test('getAuthors returns mock data in development mode', async () => {
      const result = await apiService.getAuthors();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('surname');
      
      // Should not call the API client in development mode
      expect(mockApiClient.authors.getAuthors).not.toHaveBeenCalled();
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
      
      // Should not call the API client in development mode
      expect(mockApiClient.books.searchBooks).not.toHaveBeenCalled();
    });

    test('searchAuthors uses mock data in development mode', async () => {
      const result = await apiService.searchAuthors('fitzgerald');

      expect(Array.isArray(result)).toBe(true);
      expect(result.some(author => 
        author.name.toLowerCase().includes('fitzgerald') || 
        author.surname.toLowerCase().includes('fitzgerald')
      )).toBe(true);
      
      // Should not call the API client in development mode
      expect(mockApiClient.authors.searchAuthors).not.toHaveBeenCalled();
    });

    test('searchAuthors returns empty array for empty search', async () => {
      const result = await apiService.searchAuthors('');
      expect(result).toEqual([]);
    });

    test('searchAuthors returns empty array for whitespace-only search', async () => {
      const result = await apiService.searchAuthors('   ');
      expect(result).toEqual([]);
      expect(mockApiClient.authors.searchAuthors).not.toHaveBeenCalled();
    });
  });

  describe('Production Mode - API Client Calls', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
    });

    describe('User Methods', () => {
      test('getCurrentUser delegates to API client', async () => {
        const mockUser: User = {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
        };
        mockApiClient.users.getCurrentUser.mockResolvedValue(mockUser);

        const result = await apiService.getCurrentUser();

        expect(mockApiClient.users.getCurrentUser).toHaveBeenCalledWith();
        expect(result).toEqual(mockUser);
      });

      test('updateProfile delegates to API client', async () => {
        const userUpdate = { username: 'newusername' };
        const mockUpdatedUser: User = {
          id: 1,
          username: 'newusername',
          email: 'test@example.com',
        };
        mockApiClient.users.updateProfile.mockResolvedValue(mockUpdatedUser);

        const result = await apiService.updateProfile(userUpdate);

        expect(mockApiClient.users.updateProfile).toHaveBeenCalledWith(userUpdate);
        expect(result).toEqual(mockUpdatedUser);
      });
    });

    describe('Book Methods', () => {
      test('getBooks delegates to API client', async () => {
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

        const result = await apiService.getBooks({ page: 1, limit: 10 });

        expect(mockApiClient.books.getBooks).toHaveBeenCalledWith(1, 10);
        expect(result).toEqual(mockResponse);
      });

      test('getBook delegates to API client', async () => {
        const mockBook: Book = {
          id: 1,
          title: 'Test Book',
          isbnCode: '123456789',
          status: 'finished',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.books.getBook.mockResolvedValue(mockBook);

        const result = await apiService.getBook(1);

        expect(mockApiClient.books.getBook).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockBook);
      });

      test('createBook transforms data and delegates to API client', async () => {
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

        const result = await apiService.createBook(formData);

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
        expect(result).toEqual(mockResponse);
      });

      test('updateBook transforms form data correctly', async () => {
        const updateData = {
          title: 'Updated Book',
          selectedAuthors: [{ id: 2, name: 'New', surname: 'Author' }],
          selectedCategories: [3, 4],
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
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.books.updateBook.mockResolvedValue(mockResponse);

        const result = await apiService.updateBook(1, updateData);

        expect(mockApiClient.books.updateBook).toHaveBeenCalledWith(1, {
          title: 'Updated Book',
          isbnCode: undefined,
          editionNumber: undefined,
          editionDate: undefined,
          status: undefined,
          notes: undefined,
          authorIds: [2],
          categoryIds: [3, 4],
        });
        expect(result).toEqual(mockResponse);
      });

      test('updateBook handles non-form data', async () => {
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
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.books.updateBook.mockResolvedValue(mockResponse);

        const result = await apiService.updateBook(1, updateData);

        expect(mockApiClient.books.updateBook).toHaveBeenCalledWith(1, updateData);
        expect(result).toEqual(mockResponse);
      });

      test('deleteBook delegates to API client', async () => {
        mockApiClient.books.deleteBook.mockResolvedValue(undefined);

        await apiService.deleteBook(1);

        expect(mockApiClient.books.deleteBook).toHaveBeenCalledWith(1);
      });

      test('searchBooks delegates to API client in production mode', async () => {
        const mockResult = { books: [], total: 0, hasMore: false, page: 1 };
        mockApiClient.books.searchBooks.mockResolvedValue(mockResult);

        const searchParams = { q: 'test', status: 'finished' };
        const result = await apiService.searchBooks(searchParams);

        expect(mockApiClient.books.searchBooks).toHaveBeenCalledWith({
          query: 'test',
          status: 'finished',
          sortBy: undefined,
          authorId: undefined,
          categoryId: undefined,
          page: undefined,
          limit: undefined,
        });
        expect(result).toEqual(mockResult);
      });

      test('searchByIsbn delegates to API client', async () => {
        const mockResponse = { title: 'Test Book', isbn: '123456789' };
        mockApiClient.books.searchByIsbn.mockResolvedValue(mockResponse);

        const result = await apiService.searchByIsbn('123456789');

        expect(mockApiClient.books.searchByIsbn).toHaveBeenCalledWith('123456789');
        expect(result).toEqual(mockResponse);
      });

      test('createBook handles missing optional fields', async () => {
        const formData = {
          title: 'Minimal Book',
          isbnCode: '123456789',
          status: 'unread' as const,
        };

        const mockResponse: Book = {
          id: 1,
          title: 'Minimal Book',
          isbnCode: '123456789',
          status: 'unread',
          userId: 1,
          authors: [],
          categories: [],
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.books.createBook.mockResolvedValue(mockResponse);

        const result = await apiService.createBook(formData);

        expect(mockApiClient.books.createBook).toHaveBeenCalledWith({
          title: 'Minimal Book',
          isbnCode: '123456789',
          editionNumber: undefined,
          editionDate: undefined,
          status: 'unread',
          notes: undefined,
          authorIds: [],
          categoryIds: [],
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('Categories Methods', () => {
      test('getCategories delegates to API client', async () => {
        const mockCategories: Category[] = [
          { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
        ];
        mockApiClient.categories.getCategories.mockResolvedValue(mockCategories);

        const result = await apiService.getCategories();

        expect(mockApiClient.categories.getCategories).toHaveBeenCalledWith();
        expect(result).toEqual(mockCategories);
      });

      test('getCategory delegates to API client', async () => {
        const mockCategory: Category = {
          id: 1,
          name: 'Fiction',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.categories.getCategory.mockResolvedValue(mockCategory);

        const result = await apiService.getCategory(1);

        expect(mockApiClient.categories.getCategory).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockCategory);
      });

      test('createCategory delegates to API client', async () => {
        const categoryData = { name: 'New Category' };
        const mockResponse: Category = {
          id: 1,
          name: 'New Category',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.categories.createCategory.mockResolvedValue(mockResponse);

        const result = await apiService.createCategory(categoryData);

        expect(mockApiClient.categories.createCategory).toHaveBeenCalledWith(categoryData);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('Authors Methods', () => {
      test('getAuthors delegates to API client', async () => {
        const mockAuthors: Author[] = [
          { 
            id: 1, 
            name: 'Test', 
            surname: 'Author', 
            nationality: 'American',
            creationDate: '2024-01-01T00:00:00Z',
            updateDate: '2024-01-01T00:00:00Z',
          },
        ];
        mockApiClient.authors.getAuthors.mockResolvedValue(mockAuthors);

        const result = await apiService.getAuthors();

        expect(mockApiClient.authors.getAuthors).toHaveBeenCalledWith();
        expect(result).toEqual(mockAuthors);
      });

      test('searchAuthors delegates to API client', async () => {
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

        const result = await apiService.searchAuthors('fitzgerald');

        expect(mockApiClient.authors.searchAuthors).toHaveBeenCalledWith('fitzgerald');
        expect(result).toEqual(mockAuthors);
      });

      test('getAuthor delegates to API client', async () => {
        const mockAuthor: Author = {
          id: 1,
          name: 'Test',
          surname: 'Author',
          nationality: 'American',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.authors.getAuthor.mockResolvedValue(mockAuthor);

        const result = await apiService.getAuthor(1);

        expect(mockApiClient.authors.getAuthor).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockAuthor);
      });

      test('createAuthor delegates to API client', async () => {
        const authorData = { name: 'New', surname: 'Author', nationality: 'British' };
        const mockResponse: Author = {
          id: 1,
          name: 'New',
          surname: 'Author',
          nationality: 'British',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        };
        mockApiClient.authors.createAuthor.mockResolvedValue(mockResponse);

        const result = await apiService.createAuthor(authorData);

        expect(mockApiClient.authors.createAuthor).toHaveBeenCalledWith(authorData);
        expect(result).toEqual(mockResponse);
      });

      test('searchAuthors trims whitespace from search term', async () => {
        const mockAuthors: Author[] = [];
        mockApiClient.authors.searchAuthors.mockResolvedValue(mockAuthors);

        await apiService.searchAuthors('  test  ');

        expect(mockApiClient.authors.searchAuthors).toHaveBeenCalledWith('test');
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
    test('bookAPI methods are bound correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockResult = { books: [], total: 0, hasMore: false, page: 1 };
      mockApiClient.books.searchBooks.mockResolvedValue(mockResult);

      const result = await bookAPI.searchBooks({ q: 'test' });

      expect(mockApiClient.books.searchBooks).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    test('categoryAPI methods are bound correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockCategories: Category[] = [
        { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
      ];
      mockApiClient.categories.getCategories.mockResolvedValue(mockCategories);

      const result = await categoryAPI.getCategories();

      expect(mockApiClient.categories.getCategories).toHaveBeenCalled();
      expect(result).toEqual(mockCategories);
    });

    test('authorAPI methods are bound correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockAuthors: Author[] = [
        { 
          id: 1, 
          name: 'Test', 
          surname: 'Author', 
          nationality: 'American',
          creationDate: '2024-01-01T00:00:00Z',
          updateDate: '2024-01-01T00:00:00Z',
        },
      ];
      mockApiClient.authors.getAuthors.mockResolvedValue(mockAuthors);

      const result = await authorAPI.getAuthors();

      expect(mockApiClient.authors.getAuthors).toHaveBeenCalled();
      expect(result).toEqual(mockAuthors);
    });

    test('userAPI methods are bound correctly', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };
      mockApiClient.users.getCurrentUser.mockResolvedValue(mockUser);

      const result = await userAPI.getCurrentUser();

      expect(mockApiClient.users.getCurrentUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
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
    test('searchBooks handles complex search parameters', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockResult = {
        books: [],
        total: 50,
        hasMore: true,
        page: 2,
      };
      mockApiClient.books.searchBooks.mockResolvedValue(mockResult);

      const searchParams = {
        q: 'test query',
        page: 2,
        limit: 10,
        status: 'finished',
        sortBy: 'title',
        authorId: 1,
        categoryId: 2,
      };

      const result = await apiService.searchBooks(searchParams);

      expect(mockApiClient.books.searchBooks).toHaveBeenCalledWith({
        query: 'test query',
        status: 'finished',
        sortBy: 'title',
        authorId: 1,
        categoryId: 2,
        page: 2,
        limit: 10,
      });
      expect(result).toEqual(mockResult);
    });
  });
});