/**
 * Book API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { 
  Book, 
  BookFormData, 
  PaginatedResponse, 
  SearchFilters, 
  SearchResult 
} from '@my-many-books/shared-types';

export class BookApi extends BaseApiClient {
  async getBooks(
    page: number = 1,
    limit: number = 10,
    includeAuthors: boolean = true,
    includeCategories: boolean = true
  ): Promise<PaginatedResponse<Book>> {
    return this.get<PaginatedResponse<Book>>('/books', {
      params: {
        page,
        limit,
        includeAuthors: includeAuthors.toString(),
        includeCategories: includeCategories.toString()
      }
    });
  }

  async getBook(id: number): Promise<Book> {
    return this.get<Book>(`/books/${id}`);
  }

  async createBook(bookData: BookFormData): Promise<Book> {
    return this.post<Book>('/books', bookData);
  }

  async updateBook(id: number, bookData: Partial<BookFormData>): Promise<Book> {
    return this.put<Book>(`/books/${id}`, bookData);
  }

  async patchBook(id: number, bookData: Partial<BookFormData>): Promise<Book> {
    return this.patch<Book>(`/books/${id}`, bookData);
  }

  async deleteBook(id: number): Promise<void> {
    return this.delete<void>(`/books/${id}`);
  }

  async searchBooks(filters: SearchFilters): Promise<SearchResult> {
    const params = new URLSearchParams();
    
    if (filters.query) params.append('q', filters.query);
    if (filters.status) params.append('status', filters.status);
    if (filters.authorId) params.append('authorId', filters.authorId.toString());
    if (filters.categoryId) params.append('categoryId', filters.categoryId.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return this.get<SearchResult>(`/books/search?${params.toString()}`);
  }

  async searchByISBN(isbn: string): Promise<Book | null> {
    try {
      return await this.get<Book>(`/books/search/${isbn}`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async updateBookStatus(id: number, status: Book['status']): Promise<Book> {
    return this.put<Book>(`/books/${id}/status`, { status });
  }
}