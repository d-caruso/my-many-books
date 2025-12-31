// ================================================================
// src/repositories/book/BookRepositoryTypes.ts
// Domain types used by the Book repository layer
// ================================================================

import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  AssociationInput,
  CreationAttributes,
  ListOptions,
  QueryOptions,
  PaginatedResult as AdapterPaginatedResult,
  SearchFilters,
} from '../interfaces/adapters/RepositoryAdapter';
import { BookEntity } from '../../domain/entities/Book';

export type { BookEntity } from '../../domain/entities/Book';

export interface BookAssociationInput extends AssociationInput {
  authorIds?: number[];
  categoryIds?: number[];
}

export type BookQueryOptions = QueryOptions;

export interface BookSearchFilters extends SearchFilters {
  title?: string;
  isbnCode?: string;
  editionNumber?: number;
  editionDate?: string;
  status?: BookStatus;
  notes?: string;
  author?: string;
  category?: string;
  userId?: number;
  updatedSince?: string;
}

export interface BookListOptions extends ListOptions {
  includeAssociations?: boolean;
  filters?: Partial<BookSearchFilters>;
}

export type PaginatedResult<T extends BookEntity = BookEntity> = AdapterPaginatedResult<T>;

export interface BookCreationInput
  extends BookCreationAttributes,
    BookAssociationInput,
    CreationAttributes {}
