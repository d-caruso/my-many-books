/**
 * Shared React hooks for My Many Books monorepo
 * Platform-agnostic hooks that work with web, mobile, and desktop apps
 */

// Data management hooks
export { useBooks } from './useBooks';
export type {
  BooksAPI,
  BooksState,
  BooksActions,
  UseBooksOptions,
  UseBooksResult,
} from './useBooks';

export { useBookSearch } from './useBookSearch';
export type {
  BookSearchAPI,
  BookSearchState,
  BookSearchActions,
  BookSearchOptions,
  BookSearchResult,
} from './useBookSearch';

export { useCategories } from './useCategories';
export type {
  CategoriesAPI,
  CategoriesState,
  CategoriesActions,
  UseCategoriesOptions,
} from './useCategories';
export { useManageAuthors } from './useManageAuthors';
export type {
  ManageAuthorsApi,
  ManageAuthorsState,
  ManageAuthorsActions,
  ManageAuthorsOptions,
} from './useManageAuthors';
export { useManageCategories } from './useManageCategories';
export type {
  ManageCategoriesApi,
  ManageCategoriesState,
  ManageCategoriesActions,
  ManageCategoriesOptions,
} from './useManageCategories';

// Utility hooks
export { useAsyncOperation } from './useAsyncOperation';
export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';
export type { StorageAdapter, UseLocalStorageOptions } from './useLocalStorage';
