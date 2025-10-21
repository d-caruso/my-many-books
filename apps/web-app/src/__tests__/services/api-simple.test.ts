import { describe, test, expect, beforeEach, vi, type Mocked } from 'vitest';
import axios from 'axios';

// Mock environment variables using Vitest
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
vi.stubEnv('MODE', 'test');

// Mock localStorage before everything
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Create mock axios instance using vi.hoisted to avoid scope issues
const { mockAxiosInstance, requestInterceptors, responseInterceptors } = vi.hoisted(() => {
  const requestInterceptors: any[] = [];
  const responseInterceptors: any[] = [];
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          requestInterceptors.push({ onFulfilled, onRejected });
          return requestInterceptors.length - 1;
        })
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          responseInterceptors.push({ onFulfilled, onRejected });
          return responseInterceptors.length - 1;
        })
      },
    },
  };

  return {
    requestInterceptors,
    responseInterceptors,
    mockAxiosInstance,
  };
});

// Mock axios before importing the API
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

import * as apiModule from '../../services/api';

const mockedAxios = axios as Mocked<typeof axios>;

describe('API Service Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('API module loads correctly', () => {
    const api = apiModule;

    expect(api.userAPI).toBeDefined();
    expect(api.bookAPI).toBeDefined();
    expect(api.categoryAPI).toBeDefined();
    expect(api.authorAPI).toBeDefined();

    // Verify interceptors were set up (proves axios instance was created)
    // Note: We use requestInterceptors/responseInterceptors arrays which persist across clearAllMocks
    expect(requestInterceptors.length).toBeGreaterThan(0);
    expect(responseInterceptors.length).toBeGreaterThan(0);
  });

  test('API methods exist', async () => {
    const { userAPI, bookAPI, categoryAPI, authorAPI } = apiModule;

    // Test that API methods exist
    expect(typeof userAPI.getCurrentUser).toBe('function');
    expect(typeof userAPI.updateProfile).toBe('function');
    
    expect(typeof bookAPI.getBooks).toBe('function');
    expect(typeof bookAPI.getBook).toBe('function');
    expect(typeof bookAPI.createBook).toBe('function');
    expect(typeof bookAPI.updateBook).toBe('function');
    expect(typeof bookAPI.deleteBook).toBe('function');
    expect(typeof bookAPI.searchByISBN).toBe('function');
    
    expect(typeof categoryAPI.getCategories).toBe('function');
    expect(typeof categoryAPI.getCategory).toBe('function');
    expect(typeof categoryAPI.createCategory).toBe('function');
    
    expect(typeof authorAPI.getAuthors).toBe('function');
    expect(typeof authorAPI.searchAuthors).toBe('function');
    expect(typeof authorAPI.getAuthor).toBe('function');
    expect(typeof authorAPI.createAuthor).toBe('function');
  });

  test('userAPI.getCurrentUser calls correct endpoint', async () => {
    const { userAPI } = apiModule;
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

    // Mock returns just the data (response interceptor extracts .data)
    mockAxiosInstance.get.mockResolvedValue(mockUser);

    const result = await userAPI.getCurrentUser();

    // shared-api constructs full URLs with configured base URL
    expect(mockAxiosInstance.get).toHaveBeenCalled();
    const [url, config] = mockAxiosInstance.get.mock.calls[0];
    expect(url).toContain('/users');
    expect(result).toBe(mockUser);
  });

  test('bookAPI.getBooks calls correct endpoint', async () => {
    const { bookAPI} = apiModule;
    const mockResponse = {
      books: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }
    };

    // Mock returns just the data (response interceptor extracts .data)
    mockAxiosInstance.get.mockResolvedValue(mockResponse);

    const result = await bookAPI.getBooks();

    // shared-api constructs full URLs with pagination params
    expect(mockAxiosInstance.get).toHaveBeenCalled();
    const [url, config] = mockAxiosInstance.get.mock.calls[0];
    expect(url).toContain('/books');
    expect(config.params).toEqual({ page: 1, limit: 10, includeAuthors: true, includeCategories: true });
    expect(result).toBe(mockResponse);
  });

  test('categoryAPI.getCategories calls correct endpoint', async () => {
    const { categoryAPI } = apiModule;
    const mockCategories = [{ id: 1, name: 'Fiction' }];

    // Mock returns just the data (response interceptor extracts .data)
    mockAxiosInstance.get.mockResolvedValue(mockCategories);

    const result = await categoryAPI.getCategories();

    // shared-api constructs full URLs
    expect(mockAxiosInstance.get).toHaveBeenCalled();
    const [url] = mockAxiosInstance.get.mock.calls[0];
    expect(url).toContain('/categories');
    expect(result).toBe(mockCategories);
  });

  test('authorAPI.getAuthors calls correct endpoint', async () => {
    const { authorAPI } = apiModule;
    const mockAuthors = [{ id: 1, name: 'John', surname: 'Doe' }];

    // Mock returns just the data (response interceptor extracts .data)
    mockAxiosInstance.get.mockResolvedValue(mockAuthors);

    const result = await authorAPI.getAuthors();

    // shared-api constructs full URLs
    expect(mockAxiosInstance.get).toHaveBeenCalled();
    const [url] = mockAxiosInstance.get.mock.calls[0];
    expect(url).toContain('/authors');
    expect(result).toBe(mockAuthors);
  });

  test('request interceptor adds auth token', () => {
    apiModule;
    mockLocalStorage.getItem.mockReturnValue('test-token');

    // Get the request interceptor function from the captured interceptors
    const requestInterceptor = requestInterceptors[0].onFulfilled;

    const config = { headers: {} };
    const result = requestInterceptor(config);

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  test('response interceptor handles 401 errors', async () => {
    apiModule;

    // Get the error interceptor function from the captured interceptors
    const errorInterceptor = responseInterceptors[0].onRejected;

    const error = { response: { status: 401 } };

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    // Error interceptor re-throws the error, so we need to catch it
    try {
      await errorInterceptor(error);
    } catch (e) {
      // Expected to throw
    }

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    // In test mode, window.location.href is not set (guarded by MODE !== 'test')
    expect(window.location.href).toBe('');
  });
});