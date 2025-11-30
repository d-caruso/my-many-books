// ================================================================
// src/repositories/book/BookRepository.ts
// Adapter-driven implementation of the Book repository contract
// ================================================================

import { injectable } from 'inversify';
import { BookStatus, BookCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { IBookRepository } from './IBookRepository';
import {
  BookAssociationInput,
  BookCreationInput,
  BookEntity,
  BookListOptions,
  BookQueryOptions,
  BookSearchFilters,
  PaginatedResult,
} from './BookRepositoryTypes';
import { getBookRepositoryAdapter } from './adapters/BookRepositoryAdapterFactory';
import { BookRepositoryAdapter } from './adapters/BookRepositoryAdapter';

@injectable()
export class BookRepository implements IBookRepository {
  constructor(private readonly adapter: BookRepositoryAdapter = getBookRepositoryAdapter()) {}

  findById(id: number, options?: BookQueryOptions): Promise<BookEntity | null> {
    return this.adapter.findById(id, options);
  }

  findUserBookById(
    id: number,
    userId: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    return this.adapter.findUserBookById(id, userId, options);
  }

  findByIsbnCode(
    isbnCode: string,
    userId?: number,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    return this.adapter.findByIsbnCode(isbnCode, userId, options);
  }

  listUserBooks(
    userId: number,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>> {
    return this.adapter.listUserBooks(userId, options);
  }

  search(
    filters: BookSearchFilters,
    options?: BookListOptions
  ): Promise<PaginatedResult<BookEntity>> {
    return this.adapter.search(filters, options);
  }

  countUserBooks(userId: number, status?: BookStatus): Promise<number> {
    return this.adapter.countUserBooks(userId, status);
  }

  findRecentUserBooks(userId: number, limit: number): Promise<BookEntity[]> {
    return this.adapter.findRecentUserBooks(userId, limit);
  }

  create(
    payload: BookCreationAttributes,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity> {
    return this.adapter.createModel(this.buildCreateInput(payload, associations), options);
  }

  update(
    id: number,
    payload: Partial<BookCreationAttributes>,
    associations?: BookAssociationInput,
    options?: BookQueryOptions
  ): Promise<BookEntity | null> {
    return this.adapter.updateModel(id, this.buildUpdateInput(payload, associations), options);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.adapter.deleteModel(id);
    return deleted > 0;
  }

  private buildCreateInput(
    payload: BookCreationAttributes,
    associations?: BookAssociationInput
  ): BookCreationInput {
    return { ...payload, ...(associations ?? {}) };
  }

  private buildUpdateInput(
    payload: Partial<BookCreationAttributes>,
    associations?: BookAssociationInput
  ): Partial<BookCreationInput> {
    return { ...payload, ...(associations ?? {}) };
  }
}
