// ================================================================
// src/repositories/book/Repository.ts
// Contract for book persistence operations
// ================================================================

import { BookCreationAttributes, BookStatus } from '@/models/interfaces/ModelInterfaces';
import {
  BookAssociationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  BookSearchRowsResult,
  BookSearchRowsWithRelevance,
  BookSortedSearchOptions,
  PaginatedResult,
  PinnedBookResult,
} from './BookRepositoryTypes';

export interface Repository {
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
  searchFulltext(
    query: string,
    userId?: number,
    limit?: number,
    offset?: number
  ): Promise<BookSearchRowsWithRelevance>;
  searchLike(
    query: string,
    userId?: number,
    limit?: number,
    offset?: number
  ): Promise<BookSearchRowsResult>;
  searchFulltextSorted(options: BookSortedSearchOptions): Promise<BookSearchRowsWithRelevance>;
  searchLikeSorted(options: BookSortedSearchOptions): Promise<BookSearchRowsResult>;
  findPinned(userId?: number): Promise<PinnedBookResult[]>;
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
