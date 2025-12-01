// ================================================================
// src/repositories/category/CategoryRepository.ts
// Adapter-driven implementation of the Category repository contract
// ================================================================

import { injectable } from 'inversify';
import { Repository as CategoryRepositoryContract } from './Repository';
import {
  CategoryEntity,
  CategoryListOptions,
  CategoryQueryOptions,
  CategoryUpdateInput,
  PaginatedResult,
} from './CategoryRepositoryTypes';
import { CategoryRepositoryAdapter } from './adapters/CategoryRepositoryAdapter';
import { getCategoryRepositoryAdapter } from './adapters/CategoryRepositoryAdapterFactory';
import { CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';

@injectable()
export class CategoryRepository implements CategoryRepositoryContract {
  constructor(
    private readonly adapter: CategoryRepositoryAdapter = getCategoryRepositoryAdapter()
  ) {}

  findById(id: number, options?: CategoryQueryOptions): Promise<CategoryEntity | null> {
    return this.adapter.findById(id, options);
  }

  findUserCategoryById(
    id: number,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    return this.adapter.findUserCategoryById(id, userId, options);
  }

  findByName(
    name: string,
    userId: number,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    return this.adapter.findByName(name, userId, options);
  }

  list(options?: CategoryListOptions): Promise<PaginatedResult<CategoryEntity>> {
    return this.adapter.list(options);
  }

  searchByQuery(
    term: string,
    userId: number,
    limit?: number
  ): Promise<Array<Pick<CategoryEntity, 'id' | 'name'>>> {
    return this.adapter.searchByQuery(term, userId, limit);
  }

  create(
    payload: CategoryCreationAttributes,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity> {
    return this.adapter.createModel(payload, options);
  }

  update(
    id: number,
    payload: CategoryUpdateInput,
    options?: CategoryQueryOptions
  ): Promise<CategoryEntity | null> {
    return this.adapter.updateModel(id, payload, options);
  }

  async delete(id: number): Promise<boolean> {
    return (await this.adapter.deleteModel(id)) > 0;
  }

  countBooks(categoryId: number): Promise<number> {
    return this.adapter.countBooks(categoryId);
  }
}
