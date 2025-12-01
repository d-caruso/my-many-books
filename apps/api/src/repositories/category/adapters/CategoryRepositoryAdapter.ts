// ================================================================
// repositories/category/adapters/CategoryRepositoryAdapter.ts
// Contract for category adapters
// ================================================================

import {
  CategoryCreationAttributes,
  CategoryEntity,
  CategoryListOptions,
  CategoryQueryOptions,
  PaginatedResult,
} from '../CategoryRepositoryTypes';
import { RepositoryAdapter } from '../../interfaces/adapters/RepositoryAdapter';

export interface CategoryRepositoryAdapter
  extends RepositoryAdapter<
    CategoryEntity,
    CategoryCreationAttributes,
    Record<string, unknown>,
    CategoryQueryOptions,
    CategoryListOptions
  > {
  findById(id: number, options?: CategoryQueryOptions): Promise<CategoryEntity | null>;
  findUserCategoryById(
    id: number,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null>;
  findByName(
    name: string,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null>;
  list(options?: CategoryListOptions): Promise<PaginatedResult<CategoryEntity>>;
  searchByQuery(
    term: string,
    userId: number,
    limit?: number
  ): Promise<Array<Pick<CategoryEntity, 'id' | 'name'>>>;
  countBooks(categoryId: number): Promise<number>;
}
