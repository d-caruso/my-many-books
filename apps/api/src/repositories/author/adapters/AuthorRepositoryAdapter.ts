// ================================================================
// repositories/author/adapters/AuthorRepositoryAdapter.ts
// Contract for author repository adapters
// ================================================================

import {
  AuthorAssociationInput,
  AuthorCreationInput,
  AuthorEntity,
  AuthorListFilters,
  AuthorListOptions,
  AuthorQueryOptions,
  AuthorUpdateInput,
  PaginatedResult,
} from '../AuthorRepositoryTypes';
import { IRepositoryAdapter } from '../../interfaces/adapters/IRepositoryAdapter';

export interface AuthorRepositoryAdapter
  extends IRepositoryAdapter<
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
