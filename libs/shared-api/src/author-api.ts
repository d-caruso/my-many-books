/**
 * Author API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import { Author, AuthorSchema } from '@my-many-books/shared-types';

const AuthorsArraySchema = AuthorSchema.array();

export class AuthorApi extends BaseApiClient {
  async getAuthors(): Promise<Author[]> {
    const response = await this.get<unknown>('/authors');
    AuthorsArraySchema.parse(response);
    return response as Author[];
  }

  async getAuthor(id: number): Promise<Author> {
    const response = await this.get<unknown>(`/authors/${id}`);
    AuthorSchema.parse(response);
    return response as Author;
  }

  async createAuthor(authorData: Omit<Author, 'id' | 'creationDate' | 'updateDate'>): Promise<Author> {
    const response = await this.post<unknown>('/authors', authorData);
    return AuthorSchema.parse(response);
  }

  async updateAuthor(id: number, authorData: Partial<Omit<Author, 'id' | 'creationDate' | 'updateDate'>>): Promise<Author> {
    const response = await this.put<unknown>(`/authors/${id}`, authorData);
    return AuthorSchema.parse(response);
  }

  async deleteAuthor(id: number): Promise<void> {
    return this.delete<void>(`/authors/${id}`);
  }

  async searchAuthors(query: string): Promise<Author[]> {
    const response = await this.get<unknown>('/authors/search', {
      params: { q: query },
    });
    return AuthorsArraySchema.parse(response);
  }
}
