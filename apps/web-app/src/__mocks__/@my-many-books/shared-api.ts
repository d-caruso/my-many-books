/**
 * Manual mock for @my-many-books/shared-api
 */

// Create a mock API client that will throw errors when methods are called
// This simulates the behavior in production mode where API calls would fail
// if the backend is not available
const createMockApiClient = () => ({
  books: {
    getBooks: () => Promise.reject(new Error('API call failed - no backend available')),
    getBook: () => Promise.reject(new Error('API call failed - no backend available')),
    createBook: () => Promise.reject(new Error('API call failed - no backend available')),
    updateBook: () => Promise.reject(new Error('API call failed - no backend available')),
    deleteBook: () => Promise.reject(new Error('API call failed - no backend available')),
    searchBooks: () => Promise.reject(new Error('API call failed - no backend available')),
    searchByISBN: () => Promise.reject(new Error('API call failed - no backend available')),
  },
  categories: {
    getCategories: () => Promise.reject(new Error('API call failed - no backend available')),
    getCategory: () => Promise.reject(new Error('API call failed - no backend available')),
    createCategory: () => Promise.reject(new Error('API call failed - no backend available')),
  },
  authors: {
    getAuthors: () => Promise.reject(new Error('API call failed - no backend available')),
    getAuthor: () => Promise.reject(new Error('API call failed - no backend available')),
    createAuthor: () => Promise.reject(new Error('API call failed - no backend available')),
    searchAuthors: () => Promise.reject(new Error('API call failed - no backend available')),
  },
  users: {
    getCurrentUser: () => Promise.reject(new Error('API call failed - no backend available')),
    updateProfile: () => Promise.reject(new Error('API call failed - no backend available')),
  },
});

export const createApiClient = (_httpClient?: any, _config?: any) => createMockApiClient();

// Export other required types and classes for compatibility
export class ApiClient {}
export class BookApi {}
export class AuthorApi {}
export class CategoryApi {}
export class UserApi {}
export class BaseApiClient {}

// Export types (these will be ignored by Jest but needed for TypeScript compilation)
export interface HttpClient {}
export interface RequestConfig {}
export interface ApiClientConfig {}