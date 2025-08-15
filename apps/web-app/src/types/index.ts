/**
 * Re-export shared types for backward compatibility
 * TODO: Update all imports to use @my-many-books/shared-types directly
 */

// Re-export everything from shared-types
export * from '@my-many-books/shared-types';

// Legacy exports for gradual migration
// These can be removed once all components are updated
export type { Book, Author, Category, User, AuthUser } from '@my-many-books/shared-types';
export type { SearchFilters, SearchResult, PaginatedResponse, ApiError } from '@my-many-books/shared-types';
export type { ThemeName, Theme } from '@my-many-books/shared-types';
export type { BookCardProps } from '@my-many-books/shared-types';