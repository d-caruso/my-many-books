// ================================================================
// src/repositories/book/BookRepositoryTypes.ts
// Domain types used by the Book repository layer
// ================================================================

import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  IAssociationInput,
  ICreationAttributes,
  IListOptions,
  IQueryOptions,
  PaginatedResult as AdapterPaginatedResult,
} from '../interfaces/adapters/IRepositoryAdapter';
import { BookEntity } from '../../domain/entities/Book';

export type { BookEntity } from '../../domain/entities/Book';

export interface BookAssociationInput extends IAssociationInput {
  authorIds?: number[];
  categoryIds?: number[];
}

export interface BookQueryOptions extends IQueryOptions {
  transaction?: import('sequelize').Transaction | null;
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

export interface BookListOptions extends IListOptions {
  includeAssociations?: boolean;
  filters?: Partial<BookSearchFilters>;
}

export type PaginatedResult<T extends BookEntity = BookEntity> = AdapterPaginatedResult<T>;

export interface BookCreationInput
  extends BookCreationAttributes,
    BookAssociationInput,
    ICreationAttributes {}
