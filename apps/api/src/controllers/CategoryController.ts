// ================================================================
// src/controllers/CategoryController.ts
// ================================================================

import Joi from 'joi';
import { inject, injectable } from 'inversify';
import { BaseController } from './base/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { TYPES } from '../container/types';
import {
  CategoryService,
  CategoryServiceError,
  CategoryUserContext,
} from '../services/category/CategoryService';
import { CreateCategoryDTO } from '../dtos/category/CreateCategoryDTO';
import { UpdateCategoryDTO } from '../dtos/category/UpdateCategoryDTO';
import { toCategoryResponseDTO } from '../dtos/category/CategoryResponseDTO';
import { Repository as CategoryRepositoryContract } from '../repositories/category/Repository';
import { Repository as BookRepositoryContract } from '../repositories/book/Repository';
import { SORT_DIRECTIONS, ERROR_CODES } from '@my-many-books/shared-types';
import { ApiErrorPayload } from '../common/ApiResponse';
import { Book } from '../models';
import { emitHookEvent } from '../services/hooks/hookSystem';
import { EVENTS } from '../services/hooks/events';

export interface CategorySearchFilters {
  name?: string;
  userId?: number;
  updatedSince?: string;
}

@injectable()
export class CategoryController extends BaseController {
  private readonly searchFiltersSchema = Joi.object<CategorySearchFilters>({
    name: Joi.string().max(200).optional().trim(),
    updatedSince: Joi.string().isoDate().optional(),
  });

  constructor(
    @inject(TYPES.CategoryService) private readonly categoryService: CategoryService,
    @inject(TYPES.CategoryRepository) private readonly categoryRepository: CategoryRepositoryContract,
    @inject(TYPES.BookRepository) private readonly bookRepository: BookRepositoryContract
  ) {
    super();
    this.categoryService.initializeControllerContext();
  }

  async createCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    const dto = CreateCategoryDTO.from(body);
    const serviceInput = dto.toServiceInput();

    await emitHookEvent(EVENTS.CATEGORY.CREATE.BEFORE, {
      user: this.mapRequestUser(request),
      input: serviceInput,
    });

    try {
      const created = await this.categoryService.createCategory(
        serviceInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toCategoryResponseDTO(created),
        this.t('common:category_created'),
        undefined,
        201
      );
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async getCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId || isNaN(Number(categoryId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, {
        resource: 'category',
      });
    }

    const includeBooks = this.getQueryParameter(request, 'includeBooks') === 'true';

    try {
      const category = await this.categoryService.getCategory(
        Number(categoryId),
        this.getUserContext(request)!,
        includeBooks
      );
      return this.createSuccessResponse(toCategoryResponseDTO(category));
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async updateCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId || isNaN(Number(categoryId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, {
        resource: 'category',
      });
    }

    const body = this.parseBody(request);
    const dto = UpdateCategoryDTO.from(body);
    const updateInput = dto.toServiceInput();

    await emitHookEvent(EVENTS.CATEGORY.UPDATE.BEFORE, {
      user: this.mapRequestUser(request),
      categoryId: Number(categoryId),
      input: updateInput,
    });

    try {
      const updated = await this.categoryService.updateCategory(
        Number(categoryId),
        updateInput,
        this.getUserContext(request)!
      );
      return this.createSuccessResponse(
        toCategoryResponseDTO(updated),
        this.t('common:category_updated')
      );
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async deleteCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId || isNaN(Number(categoryId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, {
        resource: 'category',
      });
    }

    const forceDelete = this.getQueryParameter(request, 'force') === 'true';

    const numericCategoryId = Number(categoryId);
    await emitHookEvent(EVENTS.CATEGORY.DELETE.BEFORE, {
      user: this.mapRequestUser(request),
      categoryId: numericCategoryId,
      force: forceDelete,
    });

    try {
      await this.categoryService.deleteCategory(numericCategoryId, this.getUserContext(request)!, forceDelete);
      return this.createSuccessResponse(null, this.t('common:category_deleted'), undefined, 204);
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async listCategories(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const filtersParam = this.getQueryParameter(request, 'filters');
    const updatedSince = this.getQueryParameter(request, 'updatedSince');

    let searchFilters: CategorySearchFilters = {};
    if (filtersParam) {
      try {
        const parsedFilters: unknown = JSON.parse(filtersParam);
        if (!this.isRecord(parsedFilters)) {
          return this.createErrorResponseI18n('errors:invalid_filters', 400);
        }
        const filterValidation = this.validateRequest(parsedFilters, this.searchFiltersSchema);
        if (!filterValidation.isValid) {
          return this.createErrorResponseI18n(
            'errors:validation_failed',
            400,
            undefined,
            filterValidation.errors ? { errors: filterValidation.errors } : undefined
          );
        }
        searchFilters = filterValidation.value!;
      } catch {
        return this.createErrorResponseI18n('errors:invalid_filters', 400);
      }
    }

    if (updatedSince) {
      searchFilters.updatedSince = updatedSince;
    }

    try {
      // Add user filter
      const userContext = this.getUserContext(request)!;
      const filters: CategorySearchFilters = { ...searchFilters, userId: userContext.userId };

      const listOptions = {
        limit: pagination.limit,
        offset: pagination.offset,
        orderBy: 'name',
        orderDirection: SORT_DIRECTIONS.ASC,
        filters,
      };

      const result = await this.categoryRepository.list(listOptions);

      const page = pagination.page;
      const totalPages = Math.ceil(result.total / pagination.limit) || 1;
      const meta = {
        page,
        limit: pagination.limit,
        totalCount: result.total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return this.createSuccessResponse(
        result.rows.map(toCategoryResponseDTO),
        'Categories retrieved successfully',
        meta
      );
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async getCategoryBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId || isNaN(Number(categoryId))) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, {
        resource: 'category',
      });
    }

    const pagination = this.getPaginationParams(request);

    try {
      const category = await this.categoryService.getCategory(
        Number(categoryId),
        this.getUserContext(request)!
      );

      const result = await this.bookRepository.search(
        { categoryId: category.id },
        { limit: pagination.limit, offset: pagination.offset, orderBy: Book.SORTABLE_FIELDS.TITLE, orderDirection: SORT_DIRECTIONS.ASC }
      );

      const totalPages = Math.ceil(result.total / pagination.limit) || 1;
      const meta = {
        page: pagination.page,
        limit: pagination.limit,
        totalCount: result.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      };

      return this.createSuccessResponse(
        {
          category: toCategoryResponseDTO(category),
          books: result.rows,
        },
        'Category books retrieved successfully',
        meta
      );
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  private getUserContext(request: UniversalRequest): CategoryUserContext | null {
    if (!request.user) {
      return null;
    }
    const context: CategoryUserContext = {
      userId: request.user.id,
    };
    if (request.user.role) {
      context.role = request.user.role;
    }
    return context;
  }

  private handleCategoryServiceError(error: unknown): ApiResponse {
    if (!(error instanceof CategoryServiceError)) {
      throw error;
    }

    switch (error.code) {
      case 'DUPLICATE_CATEGORY':
        return {
          statusCode: 409,
          success: false,
          error: {
            code: ERROR_CODES.DUPLICATE_CATEGORY,
            message: this.t('errors:resource_exists', { resource: 'Category', field: 'name' }),
          } as ApiErrorPayload,
        };
      case 'CATEGORY_NOT_FOUND':
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      case 'CATEGORY_HAS_BOOKS':
        return {
          statusCode: 409,
          success: false,
          error: {
            code: 'CATEGORY_HAS_BOOKS',
            message: this.t('errors:category_has_books'),
          } as ApiErrorPayload,
        };
      case 'FORBIDDEN':
      default:
        return this.createErrorResponseI18n('errors:permission_denied', 403);
    }
  }

  private mapRequestUser(request: UniversalRequest): { id: number; role?: string } | null {
    if (!request.user) {
      return null;
    }
    const summary: { id: number; role?: string } = {
      id: request.user.id,
    };
    if (request.user.role) {
      summary.role = request.user.role;
    }
    return summary;
  }
}
