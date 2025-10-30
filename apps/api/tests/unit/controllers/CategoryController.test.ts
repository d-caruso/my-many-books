// ================================================================
// tests/controllers/CategoryController.test.ts
// ================================================================

import { CategoryController } from '../../../src/controllers/CategoryController';
import { Category, Book } from '../../../src/models';

// Mock dependencies
jest.mock('../../../src/models', () => ({
  Category: {
    findByName: jest.fn(),
    createCategory: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    searchByName: jest.fn(),
  },
  Book: {
    count: jest.fn(),
    findAndCountAll: jest.fn(),
  }
}));

interface UniversalRequest {
  body?: any;
  queryStringParameters?: { [key: string]: string | undefined };
  pathParameters?: { [key: string]: string | undefined };
  headers?: { [key: string]: string | undefined };
}

describe('CategoryController', () => {
  let categoryController: CategoryController;
  let mockRequest: UniversalRequest;

  beforeEach(() => {
    categoryController = new CategoryController();
    jest.clearAllMocks();
    mockRequest = {
      headers: { 'accept-language': 'en' },
    };
  });

  describe('createCategory', () => {
    const validCategoryData = {
      name: 'Fiction',
    };

    it('should create a category successfully', async () => {
      const mockCreatedCategory = { id: 1, name: 'Fiction' };

      (Category.findByName as jest.Mock).mockResolvedValue(null);
      (Category.createCategory as jest.Mock).mockResolvedValue(mockCreatedCategory);

      mockRequest.body = JSON.stringify(validCategoryData);

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Category created successfully');
      expect(result.data).toEqual(mockCreatedCategory);
    });

    it('should return 400 for missing request body', async () => {
      mockRequest.body = undefined;

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    it('should return 400 for validation errors', async () => {
      const invalidData = { name: '' }; // Empty name

      mockRequest.body = JSON.stringify(invalidData);

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate category name', async () => {
      (Category.findByName as jest.Mock).mockResolvedValue({ id: 2, name: 'Fiction' });

      mockRequest.body = JSON.stringify(validCategoryData);

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category with this name already exists');
    });

    it('should handle database errors', async () => {
      (Category.findByName as jest.Mock).mockResolvedValue(null);
      (Category.createCategory as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.body = JSON.stringify(validCategoryData);

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create category');
    });
  });

  describe('getCategory', () => {
    it('should get a category successfully', async () => {
      const mockCategoryData = {
        id: 1,
        name: 'Fiction',
        books: [],
      };

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategoryData);

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategoryData);
    });

    it('should return 400 for invalid category ID', async () => {
      mockRequest.pathParameters = { id: 'invalid' };

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid category ID');
    });

    it('should return 404 for non-existent category', async () => {
      (Category.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category not found');
    });

    it('should handle database errors', async () => {
      (Category.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('updateCategory', () => {
    const updateData = { name: 'Updated Fiction' };

    it('should update a category successfully', async () => {
      const mockCategoryToUpdate = {
        id: 1,
        name: 'Fiction',
        update: jest.fn().mockResolvedValue(true),
      };

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategoryToUpdate);
      (Category.findByName as jest.Mock).mockResolvedValue(null); // No duplicate name

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await categoryController.updateCategory(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Category updated successfully');
      expect(mockCategoryToUpdate.update).toHaveBeenCalled();
    });

    it('should return 404 for non-existent category', async () => {
      (Category.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await categoryController.updateCategory(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category not found');
    });

    it('should return 400 for validation errors', async () => {
      const mockCategory = { id: 1, name: 'Fiction' };
      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);

      const invalidData = { name: 'a'.repeat(300) }; // Too long

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(invalidData);

      const result = await categoryController.updateCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should return 409 for duplicate name conflict', async () => {
      const mockCategory = { id: 1, name: 'Fiction' };
      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
      (Category.findByName as jest.Mock).mockResolvedValue({ id: 2, name: 'Updated Fiction' }); // Duplicate exists

      mockRequest.pathParameters = { id: '1' };
      mockRequest.body = JSON.stringify(updateData);

      const result = await categoryController.updateCategory(mockRequest);

      expect(result.statusCode).toBe(409);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category with this name already exists');
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      const mockCategoryToDelete = {
        id: 1,
        destroy: jest.fn(),
      };

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategoryToDelete);
      (Book.count as jest.Mock).mockResolvedValue(0); // No associated books

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.deleteCategory(mockRequest);

      expect(result.statusCode).toBe(204);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Category deleted successfully');
      expect(mockCategoryToDelete.destroy).toHaveBeenCalled();
    });

    it('should return 404 for non-existent category', async () => {
      (Category.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await categoryController.deleteCategory(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category not found');
    });

    it('should return 400 for invalid category ID', async () => {
      mockRequest.pathParameters = { id: 'invalid' };

      const result = await categoryController.deleteCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid category ID');
    });

    it('should handle database errors during deletion', async () => {
      const mockCategoryToDelete = {
        id: 1,
        destroy: jest.fn().mockRejectedValue(new Error('Delete failed')),
      };

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategoryToDelete);
      (Book.count as jest.Mock).mockResolvedValue(0);

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.deleteCategory(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete category');
    });
  });

  describe('listCategories', () => {
    it('should list categories with pagination', async () => {
      const mockCategories = [
        { id: 1, name: 'Fiction' },
        { id: 2, name: 'Non-Fiction' },
      ];

      (Category.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockCategories,
      });

      mockRequest.queryStringParameters = { page: '1', limit: '10' };

      const result = await categoryController.listCategories(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategories);
      expect(result.pagination).toEqual({
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 2,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }
      });
    });

    it('should handle search filter', async () => {
      const mockCategories = [{ id: 1, name: 'Fiction' }];

      (Category.searchByName as jest.Mock).mockResolvedValue(mockCategories);

      mockRequest.queryStringParameters = { search: 'Fiction' };

      const result = await categoryController.listCategories(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategories);
    });

    it('should handle empty results', async () => {
      (Category.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      mockRequest.queryStringParameters = {};

      const result = await categoryController.listCategories(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect((result as any).pagination?.pagination?.totalCount).toBe(0);
    });

    it('should handle database errors', async () => {
      (Category.findAndCountAll as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.queryStringParameters = {};

      const result = await categoryController.listCategories(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('getCategoryBooks', () => {
    it('should get books for a category successfully', async () => {
      const mockCategory = {
        id: 1,
        name: 'Fiction',
      };

      const mockBooks = [
        { id: 1, title: 'Book 1' },
        { id: 2, title: 'Book 2' },
      ];

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 2,
        rows: mockBooks,
      });

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.getCategoryBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        category: { id: 1, name: 'Fiction' },
        books: mockBooks,
      });
    });

    it('should return 404 for non-existent category', async () => {
      (Category.findByPk as jest.Mock).mockResolvedValue(null);

      mockRequest.pathParameters = { id: '999' };

      const result = await categoryController.getCategoryBooks(mockRequest);

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Category not found');
    });

    it('should return 400 for invalid category ID', async () => {
      mockRequest.pathParameters = { id: 'invalid' };

      const result = await categoryController.getCategoryBooks(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid category ID');
    });

    it('should handle category with no books', async () => {
      const mockCategory = {
        id: 1,
        name: 'Fiction',
      };

      (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
      (Book.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: [],
      });

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.getCategoryBooks(mockRequest);

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        category: { id: 1, name: 'Fiction' },
        books: [],
      });
    });

    it('should handle database errors', async () => {
      (Category.findByPk as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.pathParameters = { id: '1' };

      const result = await categoryController.getCategoryBooks(mockRequest);

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle malformed JSON in request body', async () => {
      mockRequest.body = 'invalid json';

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request body is required');
    });

    it('should handle empty path parameters', async () => {
      mockRequest.pathParameters = {};

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid category ID is required');
    });

    it('should handle missing path parameters', async () => {
      delete mockRequest.pathParameters;

      const result = await categoryController.getCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Valid category ID is required');
    });

    it('should handle very long category names', async () => {
      const longName = 'a'.repeat(300);
      
      mockRequest.body = JSON.stringify({ name: longName });

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should handle category names with special characters', async () => {
      const specialName = 'Fiction & Non-Fiction (Books)';
      const mockCategory = { id: 1, name: specialName };

      (Category.findByName as jest.Mock).mockResolvedValue(null);
      (Category.createCategory as jest.Mock).mockResolvedValue(mockCategory);

      mockRequest.body = JSON.stringify({ name: specialName });

      const result = await categoryController.createCategory(mockRequest);

      expect(result.statusCode).toBe(201);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategory);
    });
  });
});