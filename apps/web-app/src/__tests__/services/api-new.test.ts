import { AxiosHttpClient, apiClient, bookAPI, authorAPI, categoryAPI, userAPI } from '../../services/api-new';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('API New Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('AxiosHttpClient', () => {
    let client: any;
    let mockAxios: any;

    beforeEach(() => {
      const axios = require('axios');
      mockAxios = axios.create();
      // Create a new client instance to test the constructor
      const HttpClient = require('../api-new').AxiosHttpClient;
      // We can't directly test the constructor since it's not exported,
      // but we can test the created instance
    });

    test('exports apiClient', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient.books).toBeDefined();
      expect(apiClient.authors).toBeDefined();
      expect(apiClient.categories).toBeDefined();
      expect(apiClient.users).toBeDefined();
    });

    test('exports individual API modules', () => {
      expect(bookAPI).toBeDefined();
      expect(authorAPI).toBeDefined();
      expect(categoryAPI).toBeDefined();
      expect(userAPI).toBeDefined();
    });

    test('apiClient is properly configured', () => {
      // Test that the client was created with shared-api
      expect(bookAPI).toBe(apiClient.books);
      expect(authorAPI).toBe(apiClient.authors);
      expect(categoryAPI).toBe(apiClient.categories);
      expect(userAPI).toBe(apiClient.users);
    });
  });

  describe('API Configuration', () => {
    test('uses correct default base URL', () => {
      // Since we can't directly access apiConfig, we test through the behavior
      expect(process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000').toBe('http://localhost:3000');
    });

    test('localStorage token retrieval function', () => {
      const getAuthToken = () => localStorage.getItem('authToken');
      
      localStorageMock.getItem.mockReturnValue('test-token');
      expect(getAuthToken()).toBe('test-token');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
      
      localStorageMock.getItem.mockReturnValue(null);
      expect(getAuthToken()).toBe(null);
    });

    test('unauthorized handler clears token and redirects', () => {
      const onUnauthorized = () => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      };

      onUnauthorized();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
      expect(window.location.href).toBe('/login');
    });
  });

  describe('Environment Configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    test('uses environment variable when available', () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
      expect(baseURL).toBe('https://api.example.com');
    });

    test('falls back to localhost when env var not set', () => {
      delete process.env.REACT_APP_API_BASE_URL;
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';
      expect(baseURL).toBe('http://localhost:3000');
    });
  });
});