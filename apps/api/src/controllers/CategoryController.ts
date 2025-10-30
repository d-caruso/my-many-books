// ================================================================
// src/controllers/CategoryController.ts
// ================================================================

import Joi from 'joi';
import { BaseController } from './base/BaseController';
import { Category, Book } from '../models';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';

interface CreateCategoryRequest {
  name: string;
}

interface UpdateCategoryRequest {
  name?: string;
}

export class CategoryController extends BaseController {
  private readonly createCategorySchema = Joi.object<CreateCategoryRequest>({
    name: Joi.string().required().max(255).trim(),
  });

  private readonly updateCategorySchema = Joi.object<UpdateCategoryRequest>({
    name: Joi.string().max(255).trim().optional(),
  });

  async createCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const body = this.parseBody<CreateCategoryRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.createCategorySchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, validation.errors);
    }

    const categoryData = validation.value!;

    // Check for duplicate category name
    const existingCategory = await Category.findByName(categoryData.name);
    if (existingCategory) {
      return this.createErrorResponseI18n('errors:resource_exists', 409, { resource: 'Category', field: 'name' });
    }

    try {
      // Create category
      const categoryCreateData = {
        name: categoryData.name,
      };
      const category = await Category.createCategory(categoryCreateData);

      return this.createSuccessResponse(category, 'Category created successfully', undefined, 201);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:create_failed', 500, { resource: 'category' }, errorMessage);
    }
  }

  async getCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'category' });
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponseI18n('errors:invalid_id', 400, { resource: 'category' });
    }

    try {
      const category = await Category.findByPk(id, {
        include: [
          {
            model: Book,
            as: 'Books',
            required: false,
          },
        ],
      });

      if (!category) {
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      }

      return this.createSuccessResponse(category, 'Category retrieved successfully');
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:internal_server_error', 500, undefined, errorMessage);
    }
  }

  async updateCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'category' });
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponseI18n('errors:invalid_id', 400, { resource: 'category' });
    }

    const body = this.parseBody<UpdateCategoryRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:request_body_required', 400);
    }

    const validation = this.validateRequest(body, this.updateCategorySchema);
    if (!validation.isValid) {
      return this.createErrorResponseI18n('errors:validation_failed', 400, undefined, validation.errors);
    }

    const categoryData = validation.value!;

    try {
      // Find the category
      const category = await Category.findByPk(id);
      if (!category) {
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      }

      // Check if new name already exists (if name is being changed)
      if (categoryData.name && categoryData.name !== category.name) {
        const existingCategory = await Category.findByName(categoryData.name);
        if (existingCategory) {
          return this.createErrorResponseI18n('errors:resource_exists', 409, { resource: 'Category', field: 'name' });
        }
      }

      // Update category
      await category.update({
        name: categoryData.name ?? category.name,
      });

      return this.createSuccessResponse(category, 'Category updated successfully');
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:update_failed', 500, { resource: 'category' }, errorMessage);
    }
  }

  async deleteCategory(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'category' });
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponseI18n('errors:invalid_id', 400, { resource: 'category' });
    }

    const force = this.getQueryParameter(request, 'force') === 'true';

    try {
      // Find the category
      const category = await Category.findByPk(id, {
        include: [
          {
            model: Book,
            as: 'Books',
            required: false,
          },
        ],
      });

      if (!category) {
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      }

      // Check if category has associated books
      const hasBooks = await Book.count({
        include: [
          {
            model: Category,
            as: 'Categories',
            where: { id: category.id },
          },
        ],
      });

      if (hasBooks > 0 && !force) {
        return this.createErrorResponseI18n('errors:category_has_books', 400);
      }

      // Delete the category
      await category.destroy();

      return this.createSuccessResponse(null, 'Category deleted successfully', undefined, 204);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:delete_failed', 500, { resource: 'category' }, errorMessage);
    }
  }

  async listCategories(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const page = parseInt(this.getQueryParameter(request, 'page') || '1', 10);
    const limit = parseInt(this.getQueryParameter(request, 'limit') || '50', 10);
    const search = this.getQueryParameter(request, 'search');

    try {
      let categories: Category[];
      let totalCount: number;

      if (search) {
        // Search categories by name
        categories = await Category.searchByName(search);
        totalCount = categories.length;

        // Apply pagination to search results
        const offset = (page - 1) * limit;
        categories = categories.slice(offset, offset + limit);
      } else {
        // Get all categories with pagination
        const result = await Category.findAndCountAll({
          order: [['name', 'ASC']],
          limit,
          offset: (page - 1) * limit,
        });
        categories = result.rows;
        totalCount = result.count;
      }

      const totalPages = Math.ceil(totalCount / limit);

      return this.createSuccessResponse(categories, 'Categories retrieved successfully', {
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:internal_server_error', 500, undefined, errorMessage);
    }
  }

  async getCategoryBooks(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'category' });
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponseI18n('errors:invalid_id', 400, { resource: 'category' });
    }

    const page = parseInt(this.getQueryParameter(request, 'page') || '1', 10);
    const limit = parseInt(this.getQueryParameter(request, 'limit') || '50', 10);

    try {
      // Check if category exists
      const category = await Category.findByPk(id);
      if (!category) {
        return this.createErrorResponseI18n('errors:category_not_found', 404);
      }

      // Get books in this category
      const result = await Book.findAndCountAll({
        include: [
          {
            model: Category,
            as: 'Categories',
            where: { id: category.id },
            through: { attributes: [] },
          },
        ],
        limit,
        offset: (page - 1) * limit,
        order: [['title', 'ASC']],
      });

      const totalPages = Math.ceil(result.count / limit);

      return this.createSuccessResponse(
        {
          category: {
            id: category.id,
            name: category.name,
          },
          books: result.rows,
        },
        'Category books retrieved successfully',
        {
          pagination: {
            page,
            limit,
            totalCount: result.count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        }
      );
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponseI18n('errors:internal_server_error', 500, undefined, errorMessage);
    }
  }
}

export const categoryController = new CategoryController();
