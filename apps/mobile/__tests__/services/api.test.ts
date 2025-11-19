// Test api.ts by bypassing the global mock
// The setupTests.ts mocks @/services/api, so we need to work around it

// Mock expo-constants
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3001/api/v1',
      },
    },
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('API Service Coverage', () => {
  beforeAll(() => {
    // Clear the mock to test the real implementation
    jest.clearAllMocks();
  });

  it('should test the real api.ts implementation', () => {
    // Temporarily unmock to test real implementation
    jest.unmock('@/services/api');
    jest.unmock('@my-many-books/shared-api');

    // Mock the shared API to avoid external dependencies
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: {
        setBaseURL: jest.fn(),
        getBooks: jest.fn(),
        createBook: jest.fn(),
        updateBook: jest.fn(),
        deleteBook: jest.fn(),
        searchBooks: jest.fn(),
        searchByIsbn: jest.fn(),
      },
      userAPI: {
        setBaseURL: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
        getCurrentUser: jest.fn(),
        setAuthToken: jest.fn(),
        clearAuthToken: jest.fn(),
      },
    }));

    // Clear cache and require the real module
    delete require.cache[require.resolve('../../src/services/api')];
    
    const realApiModule = require('../../src/services/api');
    
    // Test exports
    expect(realApiModule.bookAPI).toBeDefined();
    expect(realApiModule.userAPI).toBeDefined();
    expect(realApiModule.apiUtils).toBeDefined();
    
    // Test apiUtils functions
    expect(realApiModule.apiUtils.isOnline()).toBe(true);
    
    const headers = realApiModule.apiUtils.getAuthHeaders();
    expect(headers).toEqual({
      'Content-Type': 'application/json',
    });
    
    // Test handleOfflineError
    expect(() => {
      realApiModule.apiUtils.handleOfflineError(new Error('test'));
    }).toThrow('test');
  });

  it('should test apiUtils isOnline function', () => {
    jest.unmock('@/services/api');
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: { setBaseURL: jest.fn() },
      userAPI: { setBaseURL: jest.fn() },
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');
    
    const result = apiModule.apiUtils.isOnline();
    expect(result).toBe(true);
    expect(typeof result).toBe('boolean');
  });

  it('should test apiUtils getAuthHeaders function', () => {
    jest.unmock('@/services/api');
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: { setBaseURL: jest.fn() },
      userAPI: { setBaseURL: jest.fn() },
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');
    
    const headers = apiModule.apiUtils.getAuthHeaders();
    expect(headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should test apiUtils handleOfflineError function', () => {
    jest.unmock('@/services/api');
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: { setBaseURL: jest.fn() },
      userAPI: { setBaseURL: jest.fn() },
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');
    
    const testError = new Error('Network error');
    
    expect(() => {
      apiModule.apiUtils.handleOfflineError(testError);
    }).toThrow('Network error');
  });

  it('should test environment configuration', () => {
    const originalEnv = process.env.EXPO_PUBLIC_API_URL;

    jest.unmock('@/services/api');
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: { setBaseURL: jest.fn() },
      userAPI: { setBaseURL: jest.fn() },
    }));

    // Test with custom URL
    process.env.EXPO_PUBLIC_API_URL = 'http://test.example.com/api';
    
    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');
    
    expect(apiModule.bookAPI).toBeDefined();
    expect(apiModule.userAPI).toBeDefined();
    
    // Restore
    if (originalEnv) {
      process.env.EXPO_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_API_URL;
    }
  });

  it('should test default URL fallback', () => {
    const originalEnv = process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_URL;

    jest.unmock('@/services/api');
    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          updateBookStatus: jest.fn(),
          deleteBook: jest.fn(),
          searchBooks: jest.fn(),
          searchByISBN: jest.fn(),
        },
        users: {
          login: jest.fn(),
          register: jest.fn(),
          logout: jest.fn(),
          getCurrentUser: jest.fn(),
          updateProfile: jest.fn(),
          deleteAccount: jest.fn(),
          refreshToken: jest.fn(),
        },
        admin: {
          getAdminStats: jest.fn(),
          getAdminUsers: jest.fn(),
          updateAdminUser: jest.fn(),
          deleteAdminUser: jest.fn(),
          getAdminBooks: jest.fn(),
          updateAdminBook: jest.fn(),
          deleteAdminBook: jest.fn(),
        },
      })),
      bookAPI: { setBaseURL: jest.fn() },
      userAPI: { setBaseURL: jest.fn() },
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    const apiModule = require('../../src/services/api');
    
    expect(apiModule.bookAPI).toBeDefined();
    expect(apiModule.userAPI).toBeDefined();
    expect(apiModule.apiUtils).toBeDefined();
    
    // Restore
    if (originalEnv) {
      process.env.EXPO_PUBLIC_API_URL = originalEnv;
    }
  });
});