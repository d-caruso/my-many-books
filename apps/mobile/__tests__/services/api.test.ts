// Test api.ts by bypassing the global mock
// The setupTests.ts mocks @/services/api, so we override it at file level

import * as realApiModule from '../../src/services/api';

// Override the global setupTests mock — use the real implementation
jest.mock('@/services/api', () => jest.requireActual('@/services/api'));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock shared-api dependency for tests 1–4
jest.mock('@my-many-books/shared-api', () => ({
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
    authors: {
      getAuthors: jest.fn(),
      getAuthor: jest.fn(),
      createAuthor: jest.fn(),
      updateAuthor: jest.fn(),
      deleteAuthor: jest.fn(),
    },
    categories: {
      getCategories: jest.fn(),
      getCategory: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
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

describe('API Service Coverage', () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('should test the real api.ts implementation', async () => {
    expect(realApiModule.bookAPI).toBeDefined();
    expect(realApiModule.userAPI).toBeDefined();
    expect(realApiModule.apiUtils).toBeDefined();

    const isOnline = await realApiModule.apiUtils.isOnline();
    expect(typeof isOnline).toBe('boolean');

    const headers = realApiModule.apiUtils.getAuthHeaders();
    expect(headers).toEqual({
      'Content-Type': 'application/json',
    });

    const testError = new Error('test');
    await expect(realApiModule.apiUtils.handleOfflineError(testError)).rejects.toThrow('test');
  });

  it('should test apiUtils isOnline function', async () => {
    const result = await realApiModule.apiUtils.isOnline();
    expect(typeof result).toBe('boolean');
  });

  it('should test apiUtils getAuthHeaders function', () => {
    const headers = realApiModule.apiUtils.getAuthHeaders();
    expect(headers).toEqual({
      'Content-Type': 'application/json',
    });
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should test apiUtils handleOfflineError function', async () => {
    const testError = new Error('Network error');
    await expect(realApiModule.apiUtils.handleOfflineError(testError)).rejects.toThrow('Network error');
  });

  it('should test environment configuration', () => {
    const originalEnv = {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      origin: process.env.EXPO_PUBLIC_API_ORIGIN,
      prefix: process.env.EXPO_PUBLIC_API_PREFIX,
      version: process.env.EXPO_PUBLIC_API_VERSION,
    };

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
        authors: {
          getAuthors: jest.fn(),
          getAuthor: jest.fn(),
          createAuthor: jest.fn(),
          updateAuthor: jest.fn(),
          deleteAuthor: jest.fn(),
        },
        categories: {
          getCategories: jest.fn(),
          getCategory: jest.fn(),
          createCategory: jest.fn(),
          updateCategory: jest.fn(),
          deleteCategory: jest.fn(),
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

    // Test with custom URL parts
    delete process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_ORIGIN = 'http://test.example.com';
    process.env.EXPO_PUBLIC_API_PREFIX = '/api';

    delete require.cache[require.resolve('../../src/config/api')];
    delete require.cache[require.resolve('../../src/services/api')];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const apiModule = require('../../src/services/api');

    expect(apiModule.bookAPI).toBeDefined();
    expect(apiModule.userAPI).toBeDefined();

    // Restore
    if (originalEnv.apiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalEnv.apiUrl;
    }

    if (originalEnv.origin === undefined) {
      delete process.env.EXPO_PUBLIC_API_ORIGIN;
    } else {
      process.env.EXPO_PUBLIC_API_ORIGIN = originalEnv.origin;
    }

    if (originalEnv.prefix === undefined) {
      delete process.env.EXPO_PUBLIC_API_PREFIX;
    } else {
      process.env.EXPO_PUBLIC_API_PREFIX = originalEnv.prefix;
    }

    if (originalEnv.version === undefined) {
      delete process.env.EXPO_PUBLIC_API_VERSION;
    } else {
      process.env.EXPO_PUBLIC_API_VERSION = originalEnv.version;
    }
  });

  it('should test default URL fallback', () => {
    const originalEnv = {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      origin: process.env.EXPO_PUBLIC_API_ORIGIN,
      prefix: process.env.EXPO_PUBLIC_API_PREFIX,
      version: process.env.EXPO_PUBLIC_API_VERSION,
    };
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_ORIGIN;
    delete process.env.EXPO_PUBLIC_API_PREFIX;
    delete process.env.EXPO_PUBLIC_API_VERSION;

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
        authors: {
          getAuthors: jest.fn(),
          getAuthor: jest.fn(),
          createAuthor: jest.fn(),
          updateAuthor: jest.fn(),
          deleteAuthor: jest.fn(),
        },
        categories: {
          getCategories: jest.fn(),
          getCategory: jest.fn(),
          createCategory: jest.fn(),
          updateCategory: jest.fn(),
          deleteCategory: jest.fn(),
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

    delete require.cache[require.resolve('../../src/config/api')];
    delete require.cache[require.resolve('../../src/services/api')];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const apiModule = require('../../src/services/api');

    expect(apiModule.bookAPI).toBeDefined();
    expect(apiModule.userAPI).toBeDefined();
    expect(apiModule.apiUtils).toBeDefined();

    // Restore
    if (originalEnv.apiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalEnv.apiUrl;
    }

    if (originalEnv.origin === undefined) {
      delete process.env.EXPO_PUBLIC_API_ORIGIN;
    } else {
      process.env.EXPO_PUBLIC_API_ORIGIN = originalEnv.origin;
    }

    if (originalEnv.prefix === undefined) {
      delete process.env.EXPO_PUBLIC_API_PREFIX;
    } else {
      process.env.EXPO_PUBLIC_API_PREFIX = originalEnv.prefix;
    }

    if (originalEnv.version === undefined) {
      delete process.env.EXPO_PUBLIC_API_VERSION;
    } else {
      process.env.EXPO_PUBLIC_API_VERSION = originalEnv.version;
    }
  });

  it('caches category list in mobile API service memory and invalidates after create', async () => {
    jest.resetModules();
    jest.unmock('@/services/api');

    const mockGetCategories = jest.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'Fiction' }])
      .mockResolvedValueOnce([{ id: 1, name: 'Fiction' }, { id: 2, name: 'Fantasy' }]);
    const mockCreateCategory = jest.fn().mockResolvedValue({ id: 2, name: 'Fantasy' });

    jest.doMock('../../src/services/authService', () => ({
      authService: {
        getIdToken: jest.fn().mockResolvedValue(null),
        silentRefresh: jest.fn().mockResolvedValue(false),
        logout: jest.fn().mockResolvedValue(undefined),
        getCurrentUser: jest.fn().mockResolvedValue({ id: 123 }),
      },
    }));

    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          patchBook: jest.fn(),
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
        authors: {
          getAuthors: jest.fn(),
          getAuthor: jest.fn(),
          createAuthor: jest.fn(),
          updateAuthor: jest.fn(),
          deleteAuthor: jest.fn(),
          searchAuthors: jest.fn(),
        },
        categories: {
          getCategories: mockGetCategories,
          getCategory: jest.fn(),
          createCategory: mockCreateCategory,
          updateCategory: jest.fn(),
          deleteCategory: jest.fn(),
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
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { categoryAPI } = require('../../src/services/api');

    const first = await categoryAPI.getCategories();
    const second = await categoryAPI.getCategories();

    expect(mockGetCategories).toHaveBeenCalledTimes(1);
    expect(first).toEqual([{ id: 1, name: 'Fiction' }]);
    expect(second).toEqual([{ id: 1, name: 'Fiction' }]);
    expect(first).not.toBe(second);

    await categoryAPI.createCategory({ name: 'Fantasy' });
    const third = await categoryAPI.getCategories();

    expect(mockCreateCategory).toHaveBeenCalledTimes(1);
    expect(mockGetCategories).toHaveBeenCalledTimes(2);
    expect(third).toEqual([{ id: 1, name: 'Fiction' }, { id: 2, name: 'Fantasy' }]);
  });

  it('bypasses mobile category cache for sync getCategories(lastSyncTime)', async () => {
    jest.resetModules();
    jest.unmock('@/services/api');

    const mockGetCategories = jest.fn()
      .mockResolvedValueOnce([{ id: 1, name: 'Fiction' }])
      .mockResolvedValueOnce([{ id: 1, name: 'Fiction' }]);

    jest.doMock('../../src/services/authService', () => ({
      authService: {
        getIdToken: jest.fn().mockResolvedValue(null),
        silentRefresh: jest.fn().mockResolvedValue(false),
        logout: jest.fn().mockResolvedValue(undefined),
        getCurrentUser: jest.fn().mockResolvedValue({ id: 123 }),
      },
    }));

    jest.doMock('@my-many-books/shared-api', () => ({
      createApiClient: jest.fn(() => ({
        books: {
          getBooks: jest.fn(),
          getBook: jest.fn(),
          createBook: jest.fn(),
          updateBook: jest.fn(),
          patchBook: jest.fn(),
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
        authors: {
          getAuthors: jest.fn(),
          getAuthor: jest.fn(),
          createAuthor: jest.fn(),
          updateAuthor: jest.fn(),
          deleteAuthor: jest.fn(),
          searchAuthors: jest.fn(),
        },
        categories: {
          getCategories: mockGetCategories,
          getCategory: jest.fn(),
          createCategory: jest.fn(),
          updateCategory: jest.fn(),
          deleteCategory: jest.fn(),
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
    }));

    delete require.cache[require.resolve('../../src/services/api')];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { categoryAPI } = require('../../src/services/api');

    await categoryAPI.getCategories();
    await categoryAPI.getCategories('2026-01-01T00:00:00.000Z');

    expect(mockGetCategories).toHaveBeenCalledTimes(2);
    expect(mockGetCategories).toHaveBeenNthCalledWith(1);
    expect(mockGetCategories).toHaveBeenNthCalledWith(2, '2026-01-01T00:00:00.000Z');
  });
});
