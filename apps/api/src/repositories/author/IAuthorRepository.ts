// ================================================================
// src/repositories/author/IAuthorRepository.ts
// Contract for author persistence operations
// ================================================================

import {
  AuthorEntity,
  AuthorListOptions,
  AuthorQueryOptions,
  AuthorUpdateInput,
  PaginatedResult,
} from './AuthorRepositoryTypes';
import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export interface IAuthorRepository {
  findById(id: number, options?: AuthorQueryOptions): Promise<AuthorEntity | null>;
  findUserAuthorById(
    id: number,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null>;
  findByNameAndSurname(
    name: string,
    surname: string,
    userId: number,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null>;
  list(options?: AuthorListOptions): Promise<PaginatedResult<AuthorEntity>>;
  searchByQuery(
    term: string,
    userId: number,
    limit?: number
  ): Promise<Array<Pick<AuthorEntity, 'id' | 'name' | 'surname' | 'nationality'>>>;
  create(payload: AuthorCreationAttributes, options?: AuthorQueryOptions): Promise<AuthorEntity>;
  update(
    id: number,
    payload: AuthorUpdateInput,
    options?: AuthorQueryOptions
  ): Promise<AuthorEntity | null>;
  delete(id: number): Promise<boolean>;
  countBooks(authorId: number): Promise<number>;
}
