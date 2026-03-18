// ================================================================
// src/services/category/CategoryService.ts
// Business logic layer for category operations
// ================================================================

import { inject, injectable } from 'inversify';
import { USER_ROLES } from '@my-many-books/shared-auth';
import { TYPES } from '../../container/types';
import { Repository as CategoryRepositoryContract } from '../../repositories/category/Repository';
import {
  CategoryEntity,
  CategoryListOptions,
  PaginatedResult,
} from '../../repositories/category/CategoryRepositoryTypes';
import { CategoryCreationAttributes } from '@/models/interfaces/ModelInterfaces';
import { ApplicationError } from '../../errors/ApplicationError';
import { emitHookEvent } from '../hooks/hookSystem';
import { EVENTS } from '../hooks/events';

export type CategoryServiceErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'DUPLICATE_CATEGORY'
  | 'FORBIDDEN'
  | 'CATEGORY_HAS_BOOKS';

const categoryErrorStatus: Record<CategoryServiceErrorCode, number> = {
  CATEGORY_NOT_FOUND: 404,
  DUPLICATE_CATEGORY: 409,
  FORBIDDEN: 403,
  CATEGORY_HAS_BOOKS: 400,
};

export class CategoryServiceError extends ApplicationError {
  constructor(
    override readonly code: CategoryServiceErrorCode,
    message?: string,
    override readonly details?: Record<string, unknown>
  ) {
    super(message ?? code, categoryErrorStatus[code] ?? 400, code, details);
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
  search?: string | undefined;
}

@injectable()
class CategoryService {
  constructor(
    @inject(TYPES.CategoryRepository)
    private readonly categoryRepository: CategoryRepositoryContract
  ) {}

  initializeControllerContext(): void {
    void this.categoryRepository;
  }

  async getCategory(
    id: number,
    userContext: CategoryUserContext,
    includeBooks = false
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findById(id, {
      includeBooks,
    });

    if (!category) {
      throw new CategoryServiceError('CATEGORY_NOT_FOUND');
    }

    this.ensureOwnership(category, userContext);

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

  async searchCategories(
    term: string,
    userContext: CategoryUserContext
  ): Promise<Array<Pick<CategoryEntity, 'id' | 'name'>>> {
    return this.categoryRepository.searchByQuery(term, userContext.userId);
  }

  async createCategory(
    input: CreateCategoryInput,
    userContext: CategoryUserContext
  ): Promise<CategoryEntity> {
    const user = this.mapEventUser(userContext);
    await this.emitCategoryEvent(EVENTS.CATEGORY.CREATE.BEFORE, {
      user,
      input,
    });

    try {
      const ownerId = this.resolveOwnerId(input.userId, userContext);
      await this.ensureUniqueName(input.name, ownerId);

      const payload: CategoryCreationAttributes = {
        name: input.name,
        userId: ownerId,
      };

      const created = await this.categoryRepository.create(payload);
      await this.emitCategoryEvent(EVENTS.CATEGORY.CREATE.AFTER, {
        category: created,
        user,
        input,
      });
      return created;
    } catch (error) {
      await this.emitCategoryEvent(EVENTS.CATEGORY.CREATE.FAILURE, {
        user,
        input,
        error,
      });
      throw error;
    }
  }

  async updateCategory(
    id: number,
    input: UpdateCategoryInput,
    userContext: CategoryUserContext
  ): Promise<CategoryEntity> {
    const user = this.mapEventUser(userContext);
    await this.emitCategoryEvent(EVENTS.CATEGORY.UPDATE.BEFORE, {
      categoryId: id,
      user,
      input,
    });

    try {
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

      await this.emitCategoryEvent(EVENTS.CATEGORY.UPDATE.AFTER, {
        categoryId: id,
        category: updated,
        user,
        changes: input,
      });

      return updated;
    } catch (error) {
      await this.emitCategoryEvent(EVENTS.CATEGORY.UPDATE.FAILURE, {
        categoryId: id,
        user,
        input,
        error,
      });
      throw error;
    }
  }

  async deleteCategory(
    id: number,
    userContext: CategoryUserContext,
    force?: boolean
  ): Promise<void> {
    const user = this.mapEventUser(userContext);
    const forceDelete = force ?? false;
    await this.emitCategoryEvent(EVENTS.CATEGORY.DELETE.BEFORE, {
      categoryId: id,
      user,
      force: forceDelete,
    });

    let existing: CategoryEntity | null = null;

    try {
      existing = await this.categoryRepository.findById(id);
      if (!existing) {
        throw new CategoryServiceError('CATEGORY_NOT_FOUND');
      }

      this.ensureOwnership(existing, userContext);

      const bookCount = await this.categoryRepository.countBooks(id);
      if (bookCount > 0 && !forceDelete) {
        throw new CategoryServiceError('CATEGORY_HAS_BOOKS');
      }

      const deleted = await this.categoryRepository.delete(id);
      if (!deleted) {
        throw new CategoryServiceError('CATEGORY_NOT_FOUND');
      }

      await this.emitCategoryEvent(EVENTS.CATEGORY.DELETE.AFTER, {
        categoryId: id,
        category: existing,
        user,
        force: forceDelete,
      });
    } catch (error) {
      await this.emitCategoryEvent(EVENTS.CATEGORY.DELETE.FAILURE, {
        categoryId: id,
        category: existing,
        user,
        force: forceDelete,
        error,
      });
      throw error;
    }
  }

  // ===== helpers ==========================================================

  private async emitCategoryEvent(
    eventName: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await emitHookEvent(eventName, payload);
  }

  private mapEventUser(
    userContext?: CategoryUserContext | null
  ): { id: number; role?: string } | null {
    if (!userContext) {
      return null;
    }

    const summary: { id: number; role?: string } = {
      id: userContext.userId,
    };
    if (userContext.role) {
      summary.role = userContext.role;
    }
    return summary;
  }

  private resolveOwnerId(
    inputUserId: number | undefined,
    userContext: CategoryUserContext
  ): number {
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
