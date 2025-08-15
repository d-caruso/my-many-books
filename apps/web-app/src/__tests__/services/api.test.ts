import axios from 'axios';
import { apiService, bookAPI, categoryAPI, authorAPI } from '../../services/api';
import { Book, Author, Category, User, SearchResult, PaginatedResponse } from '../../types';

// Mock axios
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

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
delete (window as any).location;
window.location = { href: '' } as any;

// Mock environment variables
const originalEnv = process.env;

describe('ApiService', () => {
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.removeItem.mockClear();

    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };
    mockAxios.create.mockReturnValue(mockAxiosInstance);

    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor and Interceptors', () => {
    test('creates axios instance with correct base URL', () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      // Force re-instantiation by importing again
      jest.resetModules();
      require('../../services/api');

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.example.com',
        timeout: 10000,
      });
    });

    test('uses default base URL when env var not set', () => {
      delete process.env.REACT_APP_API_BASE_URL;
      
      jest.resetModules();
      require('../../services/api');

      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3000',
        timeout: 10000,
      });
    });

    test('sets up request interceptor for auth token', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      
      // Get the request interceptor function
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };
      
      const result = requestInterceptor(config);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    test('request interceptor handles missing token', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };
      
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });

    test('sets up response interceptor for error handling', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = { response: { status: 401 } };
      
      const result = responseInterceptor(error);
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(window.location.href).toBe('/login');
      expect(result).rejects.toBe(error);
    });

    test('response interceptor passes through non-401 errors', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const error = { response: { status: 500 } };
      
      const result = responseInterceptor(error);
      
      expect(mockLocalStorage.removeItem).not.toHaveBeenCalled();
      expect(result).rejects.toBe(error);
    });

    test('response interceptor passes through successful responses', () => {
      const successHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const response = { data: { test: 'data' } };
      
      const result = successHandler(response);
      
      expect(result).toBe(response);
    });
  });

  describe('User Methods', () => {
    test('getCurrentUser makes correct API call', async () => {
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

      const result = await apiService.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users');
      expect(result).toEqual(mockUser);
    });

    test('updateProfile makes correct API call', async () => {
      const userUpdate = { username: 'newusername' };
      const mockUpdatedUser: User = {
        id: 1,
        username: 'newusername',
        email: 'test@example.com',
      };
      mockAxiosInstance.put.mockResolvedValue({ data: mockUpdatedUser });

      const result = await apiService.updateProfile(userUpdate);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/users', userUpdate);
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('Mock Data Methods', () => {
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
  });

  describe('Book Methods', () => {
    test('getBooks uses mock data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;

      const result = await apiService.getBooks();

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('pagination');
    });

    test('getBooks makes API call in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const mockResponse: PaginatedResponse<Book> = {
        books: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 10,
        },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiService.getBooks();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books?');
      expect(result).toEqual(mockResponse);
    });

    test('getBooks constructs query parameters correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      
      const filters = {
        query: 'test',
        status: 'finished',
        page: 2,
        limit: 20,
      };
      mockAxiosInstance.get.mockResolvedValue({ data: { books: [], pagination: {} } });

      await apiService.getBooks(filters);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/books?search=test&status=finished&page=2&limit=20'
      );
    });

    test('getBook makes correct API call', async () => {
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
      mockAxiosInstance.get.mockResolvedValue({ data: mockBook });

      const result = await apiService.getBook(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books/1');
      expect(result).toEqual(mockBook);
    });

    test('createBook transforms form data correctly', async () => {
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
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiService.createBook(formData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/books', {
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
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await apiService.updateBook(1, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/books/1', {
        title: 'Updated Book',
        isbnCode: undefined,
        editionNumber: undefined,
        editionDate: undefined,
        status: undefined,
        notes: undefined,
        authorIds: [2],
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
      mockAxiosInstance.put.mockResolvedValue({ data: mockResponse });

      const result = await apiService.updateBook(1, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/books/1', updateData);
      expect(result).toEqual(mockResponse);
    });

    test('deleteBook makes correct API call', async () => {
      mockAxiosInstance.delete.mockResolvedValue({});

      await apiService.deleteBook(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/books/1');
    });

    test('searchBooks uses mock data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;

      const searchParams = { q: 'test' };
      const result = await apiService.searchBooks(searchParams);

      expect(result).toHaveProperty('books');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
      expect(result).toHaveProperty('page');
    });

    test('searchBooks makes API call in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockResponse = {
        books: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
        },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const searchParams = { q: 'test', status: 'finished' };
      const result = await apiService.searchBooks(searchParams);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books?search=test&status=finished');
      expect(result).toEqual({
        books: [],
        total: 0,
        hasMore: false,
        page: 1,
      });
    });

    test('searchByIsbn makes correct API call', async () => {
      const mockResponse = { title: 'Test Book', isbn: '123456789' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiService.searchByIsbn('123456789');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books/search/isbn/123456789');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Categories Methods', () => {
    test('getCategories uses mock data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;

      const result = await apiService.getCategories();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('getCategories makes API call in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockCategories: Category[] = [
        { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: { categories: mockCategories } });

      const result = await apiService.getCategories();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/categories');
      expect(result).toEqual(mockCategories);
    });

    test('getCategories handles direct array response', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockCategories: Category[] = [
        { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockCategories });

      const result = await apiService.getCategories();

      expect(result).toEqual(mockCategories);
    });

    test('getCategory makes correct API call', async () => {
      const mockCategory: Category = {
        id: 1,
        name: 'Fiction',
        creationDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z',
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockCategory });

      const result = await apiService.getCategory(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/categories/1');
      expect(result).toEqual(mockCategory);
    });

    test('createCategory makes correct API call', async () => {
      const categoryData = { name: 'New Category' };
      const mockResponse: Category = {
        id: 1,
        name: 'New Category',
        creationDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z',
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiService.createCategory(categoryData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/categories', categoryData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Authors Methods', () => {
    test('getAuthors uses mock data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;

      const result = await apiService.getAuthors();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('getAuthors makes API call in production mode', async () => {
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
      mockAxiosInstance.get.mockResolvedValue({ data: { authors: mockAuthors } });

      const result = await apiService.getAuthors();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors');
      expect(result).toEqual(mockAuthors);
    });

    test('searchAuthors returns empty array for empty search term', async () => {
      const result = await apiService.searchAuthors('');

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    test('searchAuthors uses mock data in development mode', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_API_BASE_URL;

      const result = await apiService.searchAuthors('fitzgerald');

      expect(Array.isArray(result)).toBe(true);
      expect(result.some(author => 
        author.name.toLowerCase().includes('fitzgerald') || 
        author.surname.toLowerCase().includes('fitzgerald')
      )).toBe(true);
    });

    test('searchAuthors makes API call in production mode', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

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
      mockAxiosInstance.get.mockResolvedValue({ data: { authors: mockAuthors } });

      const result = await apiService.searchAuthors('fitzgerald');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors?search=fitzgerald');
      expect(result).toEqual(mockAuthors);
    });

    test('searchAuthors handles direct array response', async () => {
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
      mockAxiosInstance.get.mockResolvedValue({ data: mockAuthors });

      const result = await apiService.searchAuthors('test');

      expect(result).toEqual(mockAuthors);
    });

    test('getAuthor makes correct API call', async () => {
      const mockAuthor: Author = {
        id: 1,
        name: 'Test',
        surname: 'Author',
        nationality: 'American',
        creationDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z',
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockAuthor });

      const result = await apiService.getAuthor(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors/1');
      expect(result).toEqual(mockAuthor);
    });

    test('createAuthor makes correct API call', async () => {
      const authorData = { name: 'New', surname: 'Author', nationality: 'British' };
      const mockResponse: Author = {
        id: 1,
        name: 'New',
        surname: 'Author',
        nationality: 'British',
        creationDate: '2024-01-01T00:00:00Z',
        updateDate: '2024-01-01T00:00:00Z',
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiService.createAuthor(authorData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/authors', authorData);
      expect(result).toEqual(mockResponse);
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
      const mockResponse = { books: [], total: 0, hasMore: false, page: 1 };
      mockAxiosInstance.get.mockResolvedValue({ data: { books: [], pagination: {} } });

      // Set up for API call instead of mock data
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const result = await bookAPI.searchBooks({ q: 'test' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books?search=test');
    });

    test('categoryAPI methods are bound correctly', async () => {
      const mockCategories: Category[] = [
        { id: 1, name: 'Fiction', creationDate: '2024-01-01T00:00:00Z', updateDate: '2024-01-01T00:00:00Z' },
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: { categories: mockCategories } });

      // Set up for API call instead of mock data
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const result = await categoryAPI.getCategories();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/categories');
      expect(result).toEqual(mockCategories);
    });

    test('authorAPI methods are bound correctly', async () => {
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
      mockAxiosInstance.get.mockResolvedValue({ data: { authors: mockAuthors } });

      // Set up for API call instead of mock data
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const result = await authorAPI.getAuthors();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors');
      expect(result).toEqual(mockAuthors);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('handles axios instance creation failure gracefully', () => {
      mockAxios.create.mockImplementation(() => {
        throw new Error('Failed to create axios instance');
      });

      expect(() => {
        jest.resetModules();
        require('../../services/api');
      }).toThrow('Failed to create axios instance');
    });

    test('searchBooks handles complex search parameters', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const mockResponse = {
        books: [],
        pagination: { currentPage: 2, totalPages: 5, totalItems: 50 },
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

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

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books?search=test%20query&status=finished&page=2&limit=10');
      expect(result).toEqual({
        books: [],
        total: 50,
        hasMore: true,
        page: 2,
      });
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
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiService.createBook(formData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/books', {
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

    test('searchAuthors trims whitespace from search term', async () => {
      process.env.NODE_ENV = 'production';
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      mockAxiosInstance.get.mockResolvedValue({ data: { authors: [] } });

      await apiService.searchAuthors('  test  ');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors?search=test');
    });

    test('searchAuthors returns empty array for whitespace-only search', async () => {
      const result = await apiService.searchAuthors('   ');

      expect(result).toEqual([]);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });
  });
});