/**
 * Shared API client for My Many Books monorepo
 * Platform-agnostic HTTP client that works with web, mobile, and desktop apps
 */

// Main API client
export { ApiClient, createApiClient } from './api-client';

// Individual API clients
export { BookApi } from './book-api';
export { AuthorApi } from './author-api';
export { CategoryApi } from './category-api';
export { UserApi } from './user-api';

// Base client and interfaces
export { BaseApiClient } from './base-client';
// Types are available through direct imports from './base-client'

// Test utilities are available in __mocks__ directory