/**
 * Jest mocks for shared-api library
 * Industry standard approach for mocking shared libraries in monorepos
 */

// Create comprehensive mock API client
export const createMockApiClient = () => ({
  books: {
    getBooks: jest.fn(),
    getBook: jest.fn(),
    createBook: jest.fn(),
    updateBook: jest.fn(),
    patchBook: jest.fn(),
    deleteBook: jest.fn(),
    searchBooks: jest.fn(),
    searchByISBN: jest.fn(),
    updateBookStatus: jest.fn(),
  },
  categories: {
    getCategories: jest.fn(),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  },
  authors: {
    getAuthors: jest.fn(),
    getAuthor: jest.fn(),
    createAuthor: jest.fn(),
    updateAuthor: jest.fn(),
    deleteAuthor: jest.fn(),
    searchAuthors: jest.fn(),
  },
  users: {
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
  settings: {
    getSettings: jest.fn(),
    getSetting: jest.fn(),
    getAllSettingsAdmin: jest.fn(),
    updateSetting: jest.fn(),
    toggleActive: jest.fn(),
  },
});

// Export mocked createApiClient function
export const createApiClient = jest.fn(() => createMockApiClient());

// Export other classes as mocks for compatibility
export const ApiClient = jest.fn();
export const BookApi = jest.fn();
export const AuthorApi = jest.fn();
export const CategoryApi = jest.fn();
export const UserApi = jest.fn();
export const SettingsApi = jest.fn();
export const BaseApiClient = jest.fn();

// Re-export types from source (avoid duplication)
export type {
  HttpClient,
  RequestConfig,
  ApiClientConfig,
} from '../base-client';