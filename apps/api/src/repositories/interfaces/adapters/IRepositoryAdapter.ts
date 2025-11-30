// ================================================================
// repositories/interfaces/adapters/IRepositoryAdapter.ts
// Generic contracts shared by every persistence adapter
// ================================================================

export interface IEntity {
  id: number | string;
  [key: string]: unknown;
}

export interface ICreationAttributes {
  [key: string]: unknown;
}

export interface IAssociationInput {
  [key: string]: unknown;
}

export interface IQueryOptions {
  transaction?: unknown;
  includeAssociations?: boolean;
}

export interface IListOptions extends IQueryOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T extends IEntity> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface IRepositoryAdapter<
  Entity extends IEntity,
  Creation extends ICreationAttributes,
  Associations extends IAssociationInput,
  Query extends IQueryOptions,
  List extends IListOptions,
> {
  buildFindOptions(options?: Query): unknown;
  buildListQuery(
    where: Record<string, unknown>,
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
