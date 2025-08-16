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
    deleteBook: jest.fn(),
    searchBooks: jest.fn(),
    searchByIsbn: jest.fn(),
  },
  categories: {
    getCategories: jest.fn(),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
  },
  authors: {
    getAuthors: jest.fn(),
    getAuthor: jest.fn(),
    createAuthor: jest.fn(),
    searchAuthors: jest.fn(),
  },
  users: {
    getCurrentUser: jest.fn(),
    updateProfile: jest.fn(),
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
export const BaseApiClient = jest.fn();

// Export mock types (these will be ignored by Jest but needed for TypeScript)
export interface HttpClient {
  get<T>(url: string, config?: any): Promise<T>;
  post<T>(url: string, data?: any, config?: any): Promise<T>;
  put<T>(url: string, data?: any, config?: any): Promise<T>;
  delete<T>(url: string, config?: any): Promise<T>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  params?: Record<string, any>;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  getAuthToken?: () => string | null;
  onUnauthorized?: () => void;
}