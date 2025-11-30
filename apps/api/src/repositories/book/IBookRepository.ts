// ================================================================
// src/repositories/book/IBookRepository.ts
// Contract for book persistence operations
// ================================================================

import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  BookAssociationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  PaginatedResult,
} from './BookRepository.types';

export interface IBookRepository {
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
  create(
    payload: BookCreationAttributes,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity>;
  update(
    id: number,
    payload: Partial<BookCreationAttributes>,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity | null>;
  delete(id: number): Promise<boolean>;
}
