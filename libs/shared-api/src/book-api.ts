/**
 * Book API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import {
  Book,
  BookFormData,
  BookFormSchema,
  BookSchema,
  BookStatus,
  BookStatusSchema,
  PaginatedResponse,
  SearchFilters,
  SearchResult,
  SearchFiltersSchema,
  SearchResultSchema,
  createPaginatedResponseSchema,
} from '@my-many-books/shared-types';

const PaginatedBooksSchema = createPaginatedResponseSchema(BookSchema);

export class BookApi extends BaseApiClient {
  private parseIsbnSearchResponse(response: unknown): Book | null {
    if (response === null || response === undefined) {
      return null;
    }

    return BookSchema.parse(response);
  }

  async getBooks(
    page: number = 1,
    limit: number = 10,
    includeAuthors: boolean = true,
    includeCategories: boolean = true,
    updatedSince?: string
  ): Promise<PaginatedResponse<Book>> {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
      includeAuthors: includeAuthors.toString(),
      includeCategories: includeCategories.toString(),
    };

    if (updatedSince) {
      params['updatedSince'] = updatedSince;
    }

    const response = await this.get<unknown>('/books', {
      params,
    });

    return PaginatedBooksSchema.parse(response) as PaginatedResponse<Book>;
  }

  async getBook(id: number): Promise<Book> {
    const response = await this.get<unknown>(`/books/${id}`);
    return BookSchema.parse(response);
  }

  async createBook(bookData: BookFormData): Promise<Book> {
    const payload = BookFormSchema.parse(bookData);
    const response = await this.post<unknown>('/books', payload);
    return BookSchema.parse(response);
  }

  async updateBook(id: number, bookData: Partial<BookFormData>): Promise<Book> {
    const payload = BookFormSchema.partial().parse(bookData);
    const response = await this.put<unknown>(`/books/${id}`, payload);
    return BookSchema.parse(response);
  }

  async patchBook(id: number, bookData: Partial<BookFormData>): Promise<Book> {
    const payload = BookFormSchema.partial().parse(bookData);
    const response = await this.patch<unknown>(`/books/${id}`, payload);
    return BookSchema.parse(response);
  }

  async deleteBook(id: number): Promise<void> {
    return this.delete<void>(`/books/${id}`);
  }

  async searchBooks(filters: SearchFilters): Promise<SearchResult> {
    const parsedFilters = SearchFiltersSchema.partial().parse(filters);
    const params = new URLSearchParams();

    if (parsedFilters.query) params.append('q', parsedFilters.query);
    if (parsedFilters.status) params.append('status', parsedFilters.status);
    if (parsedFilters.authorId) params.append('authorId', parsedFilters.authorId.toString());
    if (parsedFilters.categoryId)
      params.append('categoryId', parsedFilters.categoryId.toString());
    if (parsedFilters.sortBy) params.append('sortBy', parsedFilters.sortBy);
    if (parsedFilters.page) params.append('page', parsedFilters.page.toString());
    if (parsedFilters.limit) params.append('limit', parsedFilters.limit.toString());

    const response = await this.get<unknown>(`/books/search?${params.toString()}`);
    return SearchResultSchema.parse(response) as SearchResult;
  }

  async searchByISBN(isbn: string): Promise<Book | null> {
    try {
      const response = await this.get<unknown>(`/books/search/isbn/${encodeURIComponent(isbn)}`);
      return this.parseIsbnSearchResponse(response);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateBookStatus(id: number, status: BookStatus): Promise<Book> {
    const parsedStatus = BookStatusSchema.parse(status);
    const response = await this.patch<unknown>(`/books/${id}`, { status: parsedStatus });
    return BookSchema.parse(response);
  }
}
