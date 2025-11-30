// ================================================================
// src/repositories/category/CategoryRepository.types.ts
// Domain types shared by Category repository implementations
// ================================================================

import { CategoryAttributes, CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export interface CategoryQueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction;
}

export interface CategoryListFilters {
  name?: string;
  userId?: number;
}

export interface CategoryListOptions extends CategoryQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: Partial<CategoryListFilters>;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export type CategoryEntity = CategoryAttributes & {
  books?: Array<{ id: number; title: string }>;
};

export type CategoryUpdateInput = Partial<CategoryCreationAttributes>;
