// ================================================================
// repositories/author/adapters/AuthorRepositoryAdapter.ts
// Contract for author repository adapters
// ================================================================

import {
  AuthorAssociationInput,
  AuthorCreationInput,
  AuthorEntity,
  AuthorListOptions,
  AuthorQueryOptions,
  PaginatedResult,
} from '../AuthorRepositoryTypes';
import { RepositoryAdapter } from '../../interfaces/adapters/RepositoryAdapter';

export interface AuthorRepositoryAdapter
  extends RepositoryAdapter<
    AuthorEntity,
    AuthorCreationInput,
    AuthorAssociationInput,
    AuthorQueryOptions,
    AuthorListOptions
  > {
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
  countBooks(authorId: number): Promise<number>;
}
