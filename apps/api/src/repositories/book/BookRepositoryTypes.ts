// ================================================================
// src/repositories/book/BookRepositoryTypes.ts
// Domain types used by the Book repository layer
// ================================================================

import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  type SearchSortByField,
  type SortDirection,
} from '@my-many-books/shared-types';
import {
  ListOptions,
  QueryOptions,
  PaginatedResult as AdapterPaginatedResult,
} from '../interfaces/adapters/RepositoryAdapter';
import { BookEntity } from '../../domain/entities/Book';

export type { BookEntity } from '../../domain/entities/Book';

export interface BookAssociationInput {
  authorIds?: number[];
  categoryIds?: number[];
}

export interface BookQueryOptions extends QueryOptions {
  transaction?: import('sequelize').Transaction | null;
}

export interface BookSearchFilters {
  ids?: number[];
  title?: string;
  isbnCode?: string;
  searchQuery?: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  author?: string;
  authorId?: number;
  category?: string;
  categoryId?: number;
  userId?: number;
  updatedSince?: string;
}

export interface BookListOptions extends ListOptions {
  includeAssociations?: boolean;
  filters?: Partial<BookSearchFilters>;
}

export interface BookSortedSearchOptions {
  query: string;
  userId?: number;
  sortBy: SearchSortByField;
  sortOrder?: SortDirection;
  limit?: number;
  offset?: number;
}

export interface BookSearchRowsResult {
  rows: BookEntity[];
  total: number;
}

export interface BookSearchRowsWithRelevance extends BookSearchRowsResult {
  relevanceScores: Map<number, number>;
}

export interface PinnedBookResult {
  resourceId: number;
  priority: number;
}

export type PaginatedResult<T extends BookEntity = BookEntity> = AdapterPaginatedResult<T>;

export interface BookCreationInput
  extends BookCreationAttributes,
    BookAssociationInput {}
