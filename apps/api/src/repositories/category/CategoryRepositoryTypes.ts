// ================================================================
// src/repositories/category/CategoryRepositoryTypes.ts
// Domain types shared by Category repository implementations
// ================================================================

import type { CategoryCreationAttributes as SequelizeCategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import type { CategoryEntity } from '../../domain/entities/Category';
import {
  ListOptions,
  QueryOptions,
  PaginatedResult as AdapterPaginatedResult,
  SearchFilters,
} from '../interfaces/adapters/RepositoryAdapter';

export type { CategoryEntity };
export type CategoryCreationAttributes = SequelizeCategoryCreationAttributes;

export interface CategoryQueryOptions extends QueryOptions {
  includeBooks?: boolean;
  transaction?: import('sequelize').Transaction | null;
}

export interface CategoryListFilters extends SearchFilters {
  name?: string;
  userId?: number;
  updatedSince?: string;
}

export interface CategoryListOptions extends ListOptions {
  includeBooks?: boolean;
  filters?: Partial<CategoryListFilters>;
}

export type PaginatedResult<T extends CategoryEntity = CategoryEntity> = AdapterPaginatedResult<T>;

export type CategoryUpdateInput = Partial<CategoryCreationAttributes>;
