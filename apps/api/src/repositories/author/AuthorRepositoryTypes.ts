// ================================================================
// src/repositories/author/AuthorRepositoryTypes.ts
// Domain types shared by Author repository implementations
// ================================================================

import { AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import {
  IAssociationInput,
  ICreationAttributes,
  IListOptions,
  IQueryOptions,
  PaginatedResult as AdapterPaginatedResult,
} from '../interfaces/adapters/IRepositoryAdapter';
import { AuthorEntity } from '../../domain/entities/Author';

export type { AuthorEntity } from '../../domain/entities/Author';

export type AuthorAssociationInput = IAssociationInput;

export interface AuthorQueryOptions extends IQueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction | null;
}

export interface AuthorListFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
}

export interface AuthorListOptions extends IListOptions {
  includeBooks?: boolean;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Partial<AuthorListFilters>;
}

export type PaginatedResult<T extends AuthorEntity = AuthorEntity> = AdapterPaginatedResult<T>;

export interface AuthorCreationInput
  extends AuthorCreationAttributes,
    AuthorAssociationInput,
    ICreationAttributes {}

export type AuthorUpdateInput = Partial<AuthorCreationAttributes>;
