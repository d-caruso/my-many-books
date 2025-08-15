/**
 * Shared React hooks for My Many Books monorepo
 * Platform-agnostic hooks that work with web, mobile, and desktop apps
 */

// Data management hooks
export { useBooks } from './useBooks';
export type { BooksAPI } from './useBooks';

export { useBookSearch } from './useBookSearch';
export type { BookSearchAPI } from './useBookSearch';

export { useCategories } from './useCategories';
export type { CategoriesAPI } from './useCategories';

// Utility hooks
export { useAsyncOperation } from './useAsyncOperation';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export type { StorageAdapter } from './useLocalStorage';