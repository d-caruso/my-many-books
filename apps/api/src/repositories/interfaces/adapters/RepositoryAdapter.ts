// ================================================================
// repositories/interfaces/adapters/RepositoryAdapter.ts
// Generic contracts shared by every persistence adapter
// ================================================================

import { BaseEntity } from '../../../domain/entities/BaseEntity';
import { SortDirection } from '@my-many-books/shared-types';

export type CreationAttributes = Record<string, unknown>;

export interface QueryOptions {
  transaction?: unknown;
  includeAssociations?: boolean;
}

export interface ListOptions extends QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: SortDirection;
}

export interface PaginatedResult<T extends BaseEntity> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface RepositoryAdapter<
  Entity extends BaseEntity,
  Creation,
  Associations extends object,
  Query extends QueryOptions,
  List extends ListOptions,
  Filters extends object,
> {
  buildFindOptions(options?: Query): unknown;
  buildListQuery(
    filters: Partial<Filters>,
    options?: List
  ): {
    query: unknown;
    limit: number;
    offset: number;
  };
  syncAssociations(model: unknown, associations?: Associations): Promise<void>;
  toDomain(model: unknown): Entity | null;
  buildPaginatedResult(
    rows: unknown[],
    count: number,
    limit: number,
    offset: number
  ): PaginatedResult<Entity>;
  createModel(payload: Creation, options?: Query): Promise<Entity>;
  updateModel(id: number, payload: Partial<Creation>, options?: Query): Promise<Entity | null>;
  deleteModel(id: number): Promise<number>;
}
