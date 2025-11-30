// ================================================================
// src/repositories/author/AuthorRepository.ts
// Adapter-driven implementation of the Author repository contract
// ================================================================

import { injectable } from 'inversify';
import { IAuthorRepository } from './IAuthorRepository';
import {
  AuthorCreationInput,
  AuthorEntity,
  AuthorListOptions,
  AuthorQueryOptions,
  AuthorUpdateInput,
  PaginatedResult,
} from './AuthorRepositoryTypes';
import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { getAuthorRepositoryAdapter } from './adapters/AuthorRepositoryAdapterFactory';
import { AuthorRepositoryAdapter } from './adapters/AuthorRepositoryAdapter';

@injectable()
export class AuthorRepository implements IAuthorRepository {
  constructor(private readonly adapter: AuthorRepositoryAdapter = getAuthorRepositoryAdapter()) {}

  findById(id: number, options?: AuthorQueryOptions): Promise<AuthorEntity | null> {
    return this.adapter.findById(id, options);
  }

  findUserAuthorById(
    id: number,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    return this.adapter.findUserAuthorById(id, userId, options);
  }

  findByNameAndSurname(
    name: string,
    surname: string,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    return this.adapter.findByNameAndSurname(name, surname, userId, options);
  }

  list(options?: AuthorListOptions): Promise<PaginatedResult<AuthorEntity>> {
    return this.adapter.list(options);
  }

  searchByQuery(
    term: string,
    userId: number,
    limit?: number
  ): Promise<Array<Pick<AuthorEntity, 'id' | 'name' | 'surname' | 'nationality'>>> {
    return this.adapter.searchByQuery(term, userId, limit);
  }

  create(payload: AuthorCreationAttributes, options?: AuthorQueryOptions): Promise<AuthorEntity> {
    const input: AuthorCreationInput = { ...payload };
    return this.adapter.createModel(input, options);
  }

  update(
    id: number,
    payload: AuthorUpdateInput,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null> {
    return this.adapter.updateModel(id, payload, options);
  }

  async delete(id: number): Promise<boolean> {
    return (await this.adapter.deleteModel(id)) > 0;
  }

  countBooks(authorId: number): Promise<number> {
    return this.adapter.countBooks(authorId);
  }
}
