// ================================================================
// src/controllers/CategoryController.ts
// ================================================================

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
import { Book, Category } from '../models';
import { emitHookEvent } from '../services/hooks/hookSystem';
import { EVENTS } from '../services/hooks/events';
import { CategorySearchService } from '../services/search/CategorySearchService';

@injectable()
export class CategoryController extends BaseController {
  constructor(
    @inject(TYPES.CategoryService) private readonly categoryService: CategoryService,
    @inject(TYPES.CategorySearchService) private readonly categorySearchService: CategorySearchService
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
        'Category created successfully',
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
        'Category updated successfully'
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
      await this.categoryService.deleteCategory(numericCategoryId, this.getUserContext(request)!, {
        force: forceDelete,
      });
      return this.createSuccessResponse(null, 'Category deleted successfully', undefined, 204);
    } catch (error) {
      return this.handleCategoryServiceError(error);
    }
  }

  async listCategories(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const pagination = this.getPaginationParams(request);
    const search = this.getQueryParameter(request, 'search') ?? undefined;

    try {
      const result = await this.categoryService.listCategories(
        {
          limit: pagination.limit,
          offset: pagination.offset,
          orderBy: 'name',
          orderDirection: 'ASC',
          search,
        },
        this.getUserContext(request)!
      );

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

      const result = await Book.findAndCountAll({
        include: [
          {
            model: Category,
            as: 'Categories',
            where: { id: category.id },
            through: { attributes: [] },
          },
        ],
        limit: pagination.limit,
        offset: pagination.offset,
        order: [['title', 'ASC']],
      });

      const totalPages = Math.ceil(result.count / pagination.limit) || 1;
      const meta = {
        page: pagination.page,
        limit: pagination.limit,
        totalCount: result.count,
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

  async searchCategories(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const query = this.getQueryParameter(request, 'q') || '';
    const sortBy = this.getQueryParameter(request, 'sortBy');
    const sortOrder = this.getQueryParameter(request, 'sortOrder') as 'asc' | 'desc' | undefined;
    const limit = parseInt(this.getQueryParameter(request, 'limit') || '20', 10);
    const offset = parseInt(this.getQueryParameter(request, 'offset') || '0', 10);

    // Validate sortBy against Category.SORTABLE_FIELD_VALUES
    if (sortBy && !Category.SORTABLE_FIELD_VALUES.includes(sortBy as any)) {
      return this.createErrorResponse(
        `Invalid sortBy field: ${sortBy}. Must be one of: ${Category.SORTABLE_FIELD_VALUES.join(', ')}`,
        400
      );
    }

    // Use CategorySearchService for FULLTEXT/LIKE search
    const { results, total } = await this.categorySearchService.search({
      query: query.trim(),
      userId: request.user!.id,
      sortBy: sortBy || undefined,
      sortOrder,
      limit,
      offset,
    });

    return this.createSuccessResponse({
      results,
      total,
      limit,
      offset,
    });
  }

  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
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
        return this.createErrorResponseI18n('errors:resource_exists', 409, {
          resource: 'Category',
          field: 'name',
        });
      case 'CATEGORY_NOT_FOUND':
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      case 'CATEGORY_HAS_BOOKS':
        return this.createErrorResponseI18n('errors:category_has_books', 400);
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
