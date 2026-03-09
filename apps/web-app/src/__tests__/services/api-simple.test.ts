import { describe, test, expect, beforeEach, vi } from 'vitest';
import * as apiModule from '../../services/api';
import { USER_RESPONSE_FIELDS } from '@my-many-books/shared-types';

// Mock environment variables using Vitest
vi.stubEnv('VITE_API_ORIGIN', 'http://localhost:3000');
vi.stubEnv('VITE_API_PREFIX', '/api');
vi.stubEnv('VITE_API_VERSION', 'v1');
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
  const requestInterceptors: Array<{ onFulfilled: unknown; onRejected: unknown }> = [];
  const responseInterceptors: Array<{ onFulfilled: unknown; onRejected: unknown }> = [];
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
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      surname: 'User',
      [USER_RESPONSE_FIELDS.FULL_NAME]: 'Test User',
      isActive: true,
      role: 'user',
      [USER_RESPONSE_FIELDS.CREATED_AT]: new Date().toISOString(),
      [USER_RESPONSE_FIELDS.UPDATED_AT]: new Date().toISOString(),
    };

    // Mock returns just the data (response interceptor extracts .data)
    mockAxiosInstance.get.mockResolvedValue(mockUser);

    const result = await userAPI.getCurrentUser();

    // shared-api constructs full URLs with configured base URL
    expect(mockAxiosInstance.get).toHaveBeenCalled();
    const [url] = mockAxiosInstance.get.mock.calls[0];
    expect(url).toContain('/users');
    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      surname: mockUser.surname,
      isActive: mockUser.isActive,
      role: mockUser.role,
      creationDate: mockUser[USER_RESPONSE_FIELDS.CREATED_AT],
      updateDate: mockUser[USER_RESPONSE_FIELDS.UPDATED_AT],
    });
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
    expect(config.params).toEqual({ page: '1', limit: '5', includeAuthors: 'true', includeCategories: 'true' });
    expect(result).toEqual(mockResponse);
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
    expect(result).toEqual(mockCategories);
  });

  test('ApiService caches categories in memory across repeated getCategories calls', async () => {
    const apiService = new apiModule.ApiService();
    const mockCategories = [{ id: 1, name: 'Fiction' }];

    mockAxiosInstance.get.mockResolvedValue(mockCategories);

    const first = await apiService.getCategories();
    const second = await apiService.getCategories();

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(mockCategories);
    expect(second).toEqual(mockCategories);
    expect(first).not.toBe(second);
  });

  test('ApiService invalidates category cache after createCategory', async () => {
    const apiService = new apiModule.ApiService();
    const initialCategories = [{ id: 1, name: 'Fiction' }];
    const refreshedCategories = [{ id: 1, name: 'Fiction' }, { id: 2, name: 'Fantasy' }];

    mockAxiosInstance.get
      .mockResolvedValueOnce(initialCategories)
      .mockResolvedValueOnce(refreshedCategories);
    mockAxiosInstance.post.mockResolvedValue({ id: 2, name: 'Fantasy' });

    await apiService.getCategories();
    await apiService.createCategory({ name: 'Fantasy' });
    const afterCreate = await apiService.getCategories();

    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    expect(afterCreate).toEqual(refreshedCategories);
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
    expect(result).toEqual(mockAuthors);
  });

  test('response interceptor unwraps valid success envelope', () => {
    const onFulfilled = responseInterceptors[0]?.onFulfilled;
    expect(onFulfilled).toBeDefined();

    const result = onFulfilled({
      status: 200,
      data: {
        success: true,
        data: { id: 123 },
      },
    });

    expect(result).toEqual({ id: 123 });
  });

  test('response interceptor allows 204 without envelope', () => {
    const onFulfilled = responseInterceptors[0]?.onFulfilled;
    expect(onFulfilled).toBeDefined();

    const result = onFulfilled({
      status: 204,
      data: undefined,
    });

    expect(result).toBeUndefined();
  });

  test('response interceptor rejects non-envelope success payloads', () => {
    const onFulfilled = responseInterceptors[0]?.onFulfilled;
    expect(onFulfilled).toBeDefined();

    expect(() =>
      onFulfilled({
        status: 200,
        data: { id: 123 },
      })
    ).toThrow();
  });


});
