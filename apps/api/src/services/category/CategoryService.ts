// ================================================================
// src/services/category/CategoryService.ts
// Business logic layer for category operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { ICategoryRepository } from '../../repositories/category/ICategoryRepository';
import {
  CategoryEntity,
  CategoryListOptions,
  PaginatedResult,
} from '../../repositories/category/CategoryRepository.types';
import { CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';

export type CategoryServiceErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'DUPLICATE_CATEGORY'
  | 'FORBIDDEN'
  | 'CATEGORY_HAS_BOOKS';

export class CategoryServiceError extends Error {
  constructor(
    public readonly code: CategoryServiceErrorCode,
    message?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message ?? code);
  }
}

export interface CategoryUserContext {
  userId: number;
  role?: string;
}

export interface CreateCategoryInput {
  name: string;
  userId?: number;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface ListCategoriesInput extends CategoryListOptions {
  search?: string;
}

@injectable()
class CategoryService {
  constructor(
    @inject(TYPES.CategoryRepository) private readonly categoryRepository: ICategoryRepository
  ) {}

  initializeControllerContext(): void {
    void this.categoryRepository;
  }

  async getCategory(
    id: number,
    userContext: CategoryUserContext,
    includeBooks = false
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findUserCategoryById(id, userContext.userId, {
      includeBooks,
    });

    if (!category) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }

    return category;
  }

  async listCategories(
    params: ListCategoriesInput,
    userContext: CategoryUserContext
  ): Promise<PaginatedResult<CategoryEntity>> {
    const filters = {
      ...(params.filters ?? {}),
      userId: userContext.userId,
    };

    if (params.search) {
      filters.name = params.search;
    }

    return this.categoryRepository.list({
      ...params,
      filters,
    });
  }

  async searchCategories(term: string, userContext: CategoryUserContext): Promise<Array<Pick<CategoryEntity, 'id' | 'name'>>> {
    return this.categoryRepository.searchByQuery(term, userContext.userId);
  }

  async createCategory(
    input: CreateCategoryInput,
    userContext: CategoryUserContext
  ): Promise<CategoryEntity> {
    const ownerId = this.resolveOwnerId(input.userId, userContext);
    await this.ensureUniqueName(input.name, ownerId);

    const payload: CategoryCreationAttributes = {
      name: input.name,
      userId: ownerId,
    };

    return this.categoryRepository.create(payload);
  }

  async updateCategory(
    id: number,
    input: UpdateCategoryInput,
    userContext: CategoryUserContext
  ): Promise<CategoryEntity> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }

    this.ensureOwnership(existing, userContext);

    if (input.name && input.name !== existing.name) {
      await this.ensureUniqueName(input.name, existing.userId);
    }

    const payload: Partial<CategoryCreationAttributes> = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }

    const updated = await this.categoryRepository.update(id, payload);
    if (!updated) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }

    return updated;
  }

  async deleteCategory(
    id: number,
    userContext: CategoryUserContext,
    options?: { force?: boolean }
  ): Promise<void> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }

    this.ensureOwnership(existing, userContext);

    const bookCount = await this.categoryRepository.countBooks(id);
    if (bookCount > 0 && !options?.force) {
      throw new CategoryServiceError('CATEGORY_HAS_BOOKS');
    }

    const deleted = await this.categoryRepository.delete(id);
    if (!deleted) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }
  }

  // ===== helpers ==========================================================

  private resolveOwnerId(inputUserId: number | undefined, userContext: CategoryUserContext): number {
    if (inputUserId !== undefined) {
      if (userContext.role === USER_ROLES.ADMIN) {
        return inputUserId;
      }
      if (inputUserId !== userContext.userId) {
        throw new CategoryServiceError('FORBIDDEN');
      }
      return inputUserId;
    }

    return userContext.userId;
  }

  private async ensureUniqueName(name: string, userId: number): Promise<void> {
    const existing = await this.categoryRepository.findByName(name, userId);
    if (existing) {
      throw new CategoryServiceError('DUPLICATE_CATEGORY');
    }
  }

  private ensureOwnership(category: CategoryEntity, userContext: CategoryUserContext): void {
    if (!userContext) {
      throw new CategoryServiceError('FORBIDDEN');
    }

    if (userContext.role === USER_ROLES.ADMIN) {
      return;
    }

    if (category.userId !== userContext.userId) {
      throw new CategoryServiceError('FORBIDDEN');
    }
  }
}

export { CategoryService };
