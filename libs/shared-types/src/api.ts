/**
 * API-related type definitions
 */

import { Book, BookStatus } from './book';

export interface PaginatedResponse<T> {
  books?: T[];
  pagination: {
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

export interface SearchFilters {
  query?: string;
  status?: BookStatus;
  authorId?: number;
  categoryId?: number;
  sortBy?: 'title' | 'author' | 'date-added';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  books: Book[];
  total: number;
  hasMore: boolean;
  page: number;
}

export interface ScanResult {
  isbn: string;
  success: boolean;
  error?: string;
}