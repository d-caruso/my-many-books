/**
 * Manual mock for @my-many-books/shared-api
 */

// Create a mock API client that will throw errors when methods are called
// This simulates the behavior in production mode where API calls would fail
// if the backend is not available
const createMockApiClient = () => ({
  books: {
    getBooks: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    getBook: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    createBook: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    updateBook: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    deleteBook: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    searchBooks: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    searchByIsbn: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
  },
  categories: {
    getCategories: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    getCategory: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    createCategory: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
  },
  authors: {
    getAuthors: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    getAuthor: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    createAuthor: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    searchAuthors: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
  },
  users: {
    getCurrentUser: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
    updateProfile: jest.fn().mockRejectedValue(new Error('API call failed - no backend available')),
  },
});

export const createApiClient = jest.fn(() => createMockApiClient());

// Export other required types and classes for compatibility
export const ApiClient = jest.fn();
export const BookApi = jest.fn();
export const AuthorApi = jest.fn();
export const CategoryApi = jest.fn();
export const UserApi = jest.fn();
export const BaseApiClient = jest.fn();

// Export types (these will be ignored by Jest but needed for TypeScript compilation)
export interface HttpClient {}
export interface RequestConfig {}
export interface ApiClientConfig {}