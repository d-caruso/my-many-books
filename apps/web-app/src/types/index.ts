/**
 * Type definitions for the web app
 * TODO: Revert to @my-many-books/shared-types imports once Nx workspace is properly configured
 */

// Local type definitions until Nx workspace configuration is fixed
export interface Book {
  id: number;
  title: string;
  isbnCode: string;
  editionNumber?: number;
  editionDate?: string;
  status?: 'reading' | 'paused' | 'finished';
  notes?: string;
  userId?: number;
  authors?: Author[];
  categories?: Category[];
  creationDate: string;
  updateDate: string;
}

export interface Author {
  id: number;
  name: string;
  surname: string;
  nationality?: string;
  creationDate: string;
  updateDate: string;
}

export interface Category {
  id: number;
  name: string;
  creationDate: string;
  updateDate: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  isActive: boolean;
  creationDate: string;
  updateDate: string;
}

export interface AuthUser {
  userId: number;
  email: string;
  provider: string;
  providerUserId?: string;
  isNewUser?: boolean;
}

export interface SearchFilters {
  query?: string;
  status?: 'reading' | 'paused' | 'finished';
  sortBy?: string;
  authorId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  books: Book[];
  total: number;
  hasMore: boolean;
  page: number;
}

export interface PaginatedResponse<T> {
  books?: T[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}

export type ThemeName = 'default' | 'dark' | 'bookish' | 'forest' | 'ocean' | 'sunset' | 'lavender';

export interface Theme {
  name: string;
  colors: Record<string, string>;
}

export interface BookCardProps {
  book: Book;
  onClick?: () => void;
}

// Scanner-specific types
export interface ScanResult {
  isbn: string;
  success: boolean;
}