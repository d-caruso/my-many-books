// ================================================================
// src/repositories/author/AuthorRepositoryTypes.ts
// Domain types shared by Author repository implementations
// ================================================================

import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  ListOptions,
  QueryOptions,
  PaginatedResult as AdapterPaginatedResult,
} from '../interfaces/adapters/RepositoryAdapter';
import { AuthorEntity } from '../../domain/entities/Author';
import { SortDirection } from '@my-many-books/shared-types';

export type { AuthorEntity } from '../../domain/entities/Author';

export type AuthorAssociationInput = Record<string, never>;

export interface AuthorQueryOptions extends QueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction | null;
}

export interface AuthorListFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
  updatedSince?: string;
}

export interface AuthorListOptions extends ListOptions {
  includeBooks?: boolean;
  orderBy?: string;
  orderDirection?: SortDirection;
  filters?: Partial<AuthorListFilters>;
}

export type PaginatedResult<T extends AuthorEntity = AuthorEntity> = AdapterPaginatedResult<T>;

export type AuthorCreationInput = AuthorCreationAttributes;

export type AuthorUpdateInput = Partial<AuthorCreationAttributes>;
