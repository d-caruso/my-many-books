/**
 * Shared business logic for My Many Books monorepo
 * Platform-agnostic business managers and utilities
 */

// Business managers
export { BookManager } from './BookManager';
export type { BookAPI } from './BookManager';

export { AuthManager } from './AuthManager';
export type { AuthAPI, RegisterData, TokenStorage } from './AuthManager';

export { SearchManager } from './SearchManager';
export type { SearchAPI } from './SearchManager';