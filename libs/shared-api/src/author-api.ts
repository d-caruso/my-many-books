/**
 * Author API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { Author } from '@my-many-books/shared-types';

export class AuthorApi extends BaseApiClient {
  async getAuthors(): Promise<Author[]> {
    return this.get<Author[]>('/authors');
  }

  async getAuthor(id: number): Promise<Author> {
    return this.get<Author>(`/authors/${id}`);
  }

  async createAuthor(authorData: Omit<Author, 'id' | 'creationDate' | 'updateDate'>): Promise<Author> {
    return this.post<Author>('/authors', authorData);
  }

  async updateAuthor(id: number, authorData: Partial<Omit<Author, 'id' | 'creationDate' | 'updateDate'>>): Promise<Author> {
    return this.put<Author>(`/authors/${id}`, authorData);
  }

  async deleteAuthor(id: number): Promise<void> {
    return this.delete<void>(`/authors/${id}`);
  }

  async searchAuthors(query: string): Promise<Author[]> {
    return this.get<Author[]>('/authors/search', {
      params: { q: query }
    });
  }
}