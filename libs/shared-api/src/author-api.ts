/**
 * Author API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { Author } from '@my-many-books/shared-types';

export class AuthorApi extends BaseApiClient {
  async getAuthors(): Promise<Author[]> {
    return this.get<Author[]>('/api/authors');
  }

  async getAuthor(id: number): Promise<Author> {
    return this.get<Author>(`/api/authors/${id}`);
  }

  async createAuthor(authorData: Omit<Author, 'id' | 'creationDate' | 'updateDate'>): Promise<Author> {
    return this.post<Author>('/api/authors', authorData);
  }

  async updateAuthor(id: number, authorData: Partial<Omit<Author, 'id' | 'creationDate' | 'updateDate'>>): Promise<Author> {
    return this.put<Author>(`/api/authors/${id}`, authorData);
  }

  async deleteAuthor(id: number): Promise<void> {
    return this.delete<void>(`/api/authors/${id}`);
  }

  async searchAuthors(query: string): Promise<Author[]> {
    return this.get<Author[]>('/api/authors/search', {
      params: { q: query }
    });
  }
}