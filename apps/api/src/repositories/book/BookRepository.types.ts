// ================================================================
// src/repositories/book/BookRepository.types.ts
// Domain types used by the Book repository layer
// ================================================================

import { BookAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';

export interface BookAssociationInput {
  authorIds?: number[];
  categoryIds?: number[];
}

export interface BookQueryOptions {
  includeAssociations?: boolean;
  transaction?: import('sequelize').Transaction;
}

export interface BookSearchFilters {
  title?: string;
  isbnCode?: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  author?: string;
  category?: string;
  userId?: number;
}

export interface BookListOptions extends BookQueryOptions {
  limit?: number;
  offset?: number;
  filters?: Partial<BookSearchFilters>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export type BookEntity = BookAttributes & {
  authors?: Array<{ id: number; name: string; surname?: string }>;
  categories?: Array<{ id: number; name: string }>;
};
