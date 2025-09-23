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
    const body = this.parseBody<CreateCategoryRequest>(request);
    if (!body) {
      return this.createErrorResponse('Request body is required', 400);
    }

    const validation = this.validateRequest(body, this.createCategorySchema);
    if (!validation.isValid) {
      return this.createErrorResponse('Validation failed', 400, validation.errors);
    }

    const categoryData = validation.value!;

    // Check if category already exists
    const existingCategory = await Category.findByName(categoryData.name);
    if (existingCategory) {
      return this.createErrorResponse('Category with this name already exists', 409);
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
      return this.createErrorResponse('Failed to create category', 500, errorMessage);
    }
  }

  async getCategory(request: UniversalRequest): Promise<ApiResponse> {
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponse('Category ID is required', 400);
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponse('Invalid category ID', 400);
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
        return this.createErrorResponse('Category not found', 404);
      }

      return this.createSuccessResponse(category, 'Category retrieved successfully');
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponse('Failed to retrieve category', 500, errorMessage);
    }
  }

  async updateCategory(request: UniversalRequest): Promise<ApiResponse> {
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponse('Category ID is required', 400);
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponse('Invalid category ID', 400);
    }

    const body = this.parseBody<UpdateCategoryRequest>(request);
    if (!body) {
      return this.createErrorResponse('Request body is required', 400);
    }

    const validation = this.validateRequest(body, this.updateCategorySchema);
    if (!validation.isValid) {
      return this.createErrorResponse('Validation failed', 400, validation.errors);
    }

    const categoryData = validation.value!;

    try {
      // Find the category
      const category = await Category.findByPk(id);
      if (!category) {
        return this.createErrorResponse('Category not found', 404);
      }

      // Check if new name already exists (if name is being changed)
      if (categoryData.name && categoryData.name !== category.name) {
        const existingCategory = await Category.findByName(categoryData.name);
        if (existingCategory) {
          return this.createErrorResponse('Category with this name already exists', 409);
        }
      }

      // Update category
      await category.update({
        name: categoryData.name ?? category.name,
      });

      return this.createSuccessResponse(category, 'Category updated successfully');
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponse('Failed to update category', 500, errorMessage);
    }
  }

  async deleteCategory(request: UniversalRequest): Promise<ApiResponse> {
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponse('Category ID is required', 400);
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponse('Invalid category ID', 400);
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
        return this.createErrorResponse('Category not found', 404);
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
        return this.createErrorResponse(
          'Cannot delete category that has associated books. Use force=true to delete anyway.',
          400
        );
      }

      // Delete the category
      await category.destroy();

      return this.createSuccessResponse(null, 'Category deleted successfully', undefined, 204);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      return this.createErrorResponse('Failed to delete category', 500, errorMessage);
    }
  }

  async listCategories(request: UniversalRequest): Promise<ApiResponse> {
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
      return this.createErrorResponse('Failed to list categories', 500, errorMessage);
    }
  }

  async getCategoryBooks(request: UniversalRequest): Promise<ApiResponse> {
    const categoryId = this.getPathParameter(request, 'id');
    if (!categoryId) {
      return this.createErrorResponse('Category ID is required', 400);
    }

    const id = parseInt(categoryId, 10);
    if (isNaN(id)) {
      return this.createErrorResponse('Invalid category ID', 400);
    }

    const page = parseInt(this.getQueryParameter(request, 'page') || '1', 10);
    const limit = parseInt(this.getQueryParameter(request, 'limit') || '50', 10);

    try {
      // Check if category exists
      const category = await Category.findByPk(id);
      if (!category) {
        return this.createErrorResponse('Category not found', 404);
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
      return this.createErrorResponse('Failed to retrieve category books', 500, errorMessage);
    }
  }
}

export const categoryController = new CategoryController();
