// ================================================================
// src/repositories/category/Repository.ts
// Contract for category persistence operations
// ================================================================

import {
  CategoryEntity,
  CategoryListOptions,
  CategoryQueryOptions,
  CategoryUpdateInput,
  PaginatedResult,
} from './CategoryRepositoryTypes';
import { CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export interface Repository {
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
  create(
    payload: CategoryCreationAttributes,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity>;
  update(
    id: number,
    payload: CategoryUpdateInput,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null>;
  delete(id: number): Promise<boolean>;
  countBooks(categoryId: number): Promise<number>;
}
