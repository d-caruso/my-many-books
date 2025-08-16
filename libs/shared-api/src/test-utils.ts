/**
 * Test utilities for shared-api library
 * Provides industry-standard testing helpers for Jest
 */

import { createMockApiClient } from './__mocks__/index';

export { createMockApiClient };

// Helper to reset all mocks in the API client
export const resetApiClientMocks = (mockApiClient: ReturnType<typeof createMockApiClient>) => {
  Object.values(mockApiClient).forEach(service => {
    Object.values(service).forEach(method => {
      if (jest.isMockFunction(method)) {
        method.mockClear();
      }
    });
  });
};

// Helper to set up common mock responses
export const setupMockResponses = (mockApiClient: ReturnType<typeof createMockApiClient>) => {
  // Setup default successful responses
  mockApiClient.books.getBooks.mockResolvedValue({
    books: [],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }
  });
  
  mockApiClient.categories.getCategories.mockResolvedValue([]);
  mockApiClient.authors.getAuthors.mockResolvedValue([]);
  mockApiClient.users.getCurrentUser.mockResolvedValue({
    id: 1,
    username: 'testuser',
    email: 'test@example.com'
  });
  
  return mockApiClient;
};