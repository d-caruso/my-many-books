// ================================================================
// src/repositories/author/AuthorRepository.types.ts
// Domain types shared by Author repository implementations
// ================================================================

import { AuthorAttributes, AuthorCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export interface AuthorQueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction;
}

export interface AuthorListFilters {
  name?: string;
  surname?: string;
  nationality?: string;
  userId?: number;
}

export interface AuthorListOptions extends AuthorQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Partial<AuthorListFilters>;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export type AuthorEntity = AuthorAttributes & {
  books?: Array<{ id: number; title: string }>;
};

export type AuthorUpdateInput = Partial<AuthorCreationAttributes>;
