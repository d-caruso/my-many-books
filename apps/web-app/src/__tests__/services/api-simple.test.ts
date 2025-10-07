import { describe, test, expect, beforeEach, vi, type Mocked } from 'vitest';
import axios from 'axios';

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

// Create mock axios instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

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
    
    // Verify axios instance was created
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000',
      timeout: 10000,
    });
    
    // Verify interceptors were set up
    expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
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
    
    mockAxiosInstance.get.mockResolvedValue({ data: mockUser });

    const result = await userAPI.getCurrentUser();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/users');
    expect(result).toBe(mockUser);
  });

  test('bookAPI.getBooks calls correct endpoint', async () => {
    const { bookAPI } = apiModule;
    const mockResponse = { data: [], total: 0, page: 1, limit: 10 };
    
    mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

    const result = await bookAPI.getBooks();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/books', { params: {} });
    expect(result).toBe(mockResponse);
  });

  test('categoryAPI.getCategories calls correct endpoint', async () => {
    const { categoryAPI } = apiModule;
    const mockCategories = [{ id: 1, name: 'Fiction' }];
    
    mockAxiosInstance.get.mockResolvedValue({ data: mockCategories });

    const result = await categoryAPI.getCategories();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/categories');
    expect(result).toBe(mockCategories);
  });

  test('authorAPI.getAuthors calls correct endpoint', async () => {
    const { authorAPI } = apiModule;
    const mockAuthors = [{ id: 1, name: 'John', surname: 'Doe' }];
    
    mockAxiosInstance.get.mockResolvedValue({ data: mockAuthors });

    const result = await authorAPI.getAuthors();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/authors');
    expect(result).toBe(mockAuthors);
  });

  test('request interceptor adds auth token', () => {
    apiModule;
    mockLocalStorage.getItem.mockReturnValue('test-token');
    
    // Get the request interceptor function
    const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
    
    const config = { headers: {} };
    const result = requestInterceptor(config);

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  test('response interceptor handles 401 errors', () => {
    apiModule;
    
    const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
    
    const error = { response: { status: 401 } };
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    errorInterceptor(error);

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
    expect(window.location.href).toBe('/login');
  });
});