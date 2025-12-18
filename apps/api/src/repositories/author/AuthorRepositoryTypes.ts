// ================================================================
// src/repositories/author/AuthorRepositoryTypes.ts
// Domain types shared by Author repository implementations
// ================================================================

import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  AssociationInput,
  CreationAttributes,
  ListOptions,
  QueryOptions,
  PaginatedResult as AdapterPaginatedResult,
  SearchFilters,
} from '../interfaces/adapters/RepositoryAdapter';
import { AuthorEntity } from '../../domain/entities/Author';

export type { AuthorEntity } from '../../domain/entities/Author';

export type AuthorAssociationInput = AssociationInput;

export interface AuthorQueryOptions extends QueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction | null;
}

export interface AuthorListFilters extends SearchFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
}

export interface AuthorListOptions extends ListOptions {
  includeBooks?: boolean;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Partial<AuthorListFilters>;
}

export type PaginatedResult<T extends AuthorEntity = AuthorEntity> = AdapterPaginatedResult<T>;

export interface AuthorCreationInput
  extends AuthorCreationAttributes,
    AuthorAssociationInput,
    CreationAttributes {}

export type AuthorUpdateInput = Partial<AuthorCreationAttributes>;
