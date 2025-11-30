// ================================================================
// repositories/book/adapters/BookRepositoryAdapter.ts
// Contract every book adapter implementation must follow
// ================================================================

import { BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  BookAssociationInput,
  BookCreationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  PaginatedResult,
} from '../BookRepositoryTypes';
import { IRepositoryAdapter } from '../../interfaces/adapters/IRepositoryAdapter';

export interface BookRepositoryAdapter
  extends IRepositoryAdapter<
    BookEntity,
    BookCreationInput,
    BookAssociationInput,
    BookQueryOptions,
    BookListOptions
  > {
  findById(id: number, options?: BookQueryOptions): Promise<BookEntity | null>;
  findUserBookById(
    id: number,
    userId: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null>;
  findByIsbnCode(
    isbnCode: string,
    userId?: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null>;
  listUserBooks(userId: number, options?: BookListOptions): Promise<PaginatedResult<BookEntity>>;
  search(
    filters: BookSearchFilters,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>>;
  countUserBooks(userId: number, status?: BookStatus): Promise<number>;
  findRecentUserBooks(userId: number, limit: number): Promise<BookEntity[]>;
}
