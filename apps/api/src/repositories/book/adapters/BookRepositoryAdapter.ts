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
  BookSearchRowsResult,
  BookSearchRowsWithRelevance,
  BookSortedSearchOptions,
  PaginatedResult,
  PinnedBookResult,
} from '../BookRepositoryTypes';
import { RepositoryAdapter } from '../../interfaces/adapters/RepositoryAdapter';

export interface BookRepositoryAdapter
  extends RepositoryAdapter<
    BookEntity,
    BookCreationInput,
    BookAssociationInput,
    BookQueryOptions,
    BookListOptions,
    BookSearchFilters
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
}
