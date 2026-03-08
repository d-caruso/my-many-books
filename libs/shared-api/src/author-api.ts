/**
 * Author API client - platform agnostic
 */

import { BaseApiClient } from './base-client';
import {
  Author,
  AuthorSchema,
} from '@my-many-books/shared-types';

const AuthorsArraySchema = AuthorSchema.array();

export class AuthorApi extends BaseApiClient {
  async getAuthors(updatedSince?: string): Promise<Author[]> {
    const params: Record<string, string> = {};
    
    if (updatedSince) {
      params.updatedSince = updatedSince;
    }

    const response = await this.get<unknown>('/authors', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return AuthorsArraySchema.parse(response);
  }

  async getAuthor(id: number): Promise<Author> {
    const response = await this.get<unknown>(`/authors/${id}`);
    return AuthorSchema.parse(response);
  }

  async createAuthor(authorData: Omit<Author, 'id' | 'creationDate' | 'updateDate'>): Promise<Author> {
    const response = await this.post<unknown>('/authors', authorData);
    return AuthorSchema.parse(response);
  }

  async updateAuthor(id: number, authorData: Partial<Omit<Author, 'id' | 'creationDate' | 'updateDate'>>): Promise<Author> {
    const response = await this.put<unknown>(`/authors/${id}`, authorData);
    return AuthorSchema.parse(response);
  }

  async deleteAuthor(id: number, force?: boolean): Promise<void> {
    return this.delete<void>(`/authors/${id}`, force ? { params: { force: 'true' } } : undefined);
  }

}
