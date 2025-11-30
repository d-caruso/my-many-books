// ================================================================
// src/repositories/book/BookRepositoryTypes.ts
// Domain types used by the Book repository layer
// ================================================================

import {
  BookAttributes,
  BookCreationAttributes,
  BookStatus,
} from '@/models/interfaces/ModelInterfaces';
import {
  IAssociationInput,
  ICreationAttributes,
  IEntity,
  IListOptions,
  IQueryOptions,
  PaginatedResult as AdapterPaginatedResult,
} from '../interfaces/adapters/IRepositoryAdapter';

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

export interface BookEntity extends BookAttributes, IEntity {
  authors?: Array<{ id: number; name: string; surname?: string }>;
  categories?: Array<{ id: number; name: string }>;
}

export interface BookCreationInput
  extends BookCreationAttributes,
    BookAssociationInput,
    ICreationAttributes {}
