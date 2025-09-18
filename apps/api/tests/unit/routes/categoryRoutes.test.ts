// ================================================================
// tests/routes/categoryRoutes.test.ts
// Comprehensive tests for Category routes
// ================================================================

import request from 'supertest';
import express from 'express';
import categoryRoutes from '../../../src/routes/categoryRoutes';

// Mock the CategoryController
jest.mock('../../../src/controllers/CategoryController', () => ({
  categoryController: {
    listCategories: jest.fn(async (_req, _res) => ({
      statusCode: 200,
      body: {
        success: true,
        data: [
          { id: 1, name: 'Fiction' },
          { id: 2, name: 'Science Fiction' },
          { id: 3, name: 'Biography' }
        ],
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
      }
    })),
    getCategory: jest.fn(async (req, _res) => ({
      statusCode: 200,
      body: {
        success: true,
        data: { 
          id: parseInt(req.params?.id || '1'), 
          name: 'Fiction' 
        }
      }
    })),
    createCategory: jest.fn(async (_req, _res) => ({
      statusCode: 201,
      body: {
        success: true,
        data: { id: 1, name: 'New Category' },
        message: 'Category created successfully'
      }
    })),
    updateCategory: jest.fn(async (req, _res) => ({
      statusCode: 200,
      body: {
        success: true,
        data: { 
          id: parseInt(req.params?.id || '1'), 
          name: 'Updated Category' 
        },
        message: 'Category updated successfully'
      }
    })),
    deleteCategory: jest.fn(async (_req, _res) => ({
      statusCode: 204,
      body: {
        success: true,
        message: 'Category deleted successfully'
      }
    }))
  }
}));

describe('Category Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/categories', categoryRoutes);
  });

  describe('GET /api/categories', () => {
    it('should list all categories', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [
          { id: 1, name: 'Fiction' },
          { id: 2, name: 'Science Fiction' },
          { id: 3, name: 'Biography' }
        ],
        pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
      });
    });

    it('should handle search parameters', async () => {
      const response = await request(app)
        .get('/api/categories?search=fiction')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/categories?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should get a specific category', async () => {
      const response = await request(app)
        .get('/api/categories/123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { id: 123, name: 'Fiction' }
      });
    });

    it('should handle invalid category ID', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.getCategory.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          success: false,
          error: 'Category not found'
        }
      });

      const response = await request(app)
        .get('/api/categories/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });
  });

  describe('POST /api/categories', () => {
    it('should create a new category', async () => {
      const categoryData = {
        name: 'New Category'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(categoryData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { id: 1, name: 'New Category' },
        message: 'Category created successfully'
      });
    });

    it('should handle validation errors', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.createCategory.mockResolvedValueOnce({
        statusCode: 400,
        body: {
          success: false,
          error: 'Category name is required'
        }
      });

      const response = await request(app)
        .post('/api/categories')
        .send({ name: '' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name is required'
      });
    });

    it('should handle duplicate category names', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.createCategory.mockResolvedValueOnce({
        statusCode: 409,
        body: {
          success: false,
          error: 'Category with this name already exists'
        }
      });

      const response = await request(app)
        .post('/api/categories')
        .send({ name: 'Fiction' })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Category with this name already exists'
      });
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update a category', async () => {
      const updateData = {
        name: 'Updated Category'
      };

      const response = await request(app)
        .put('/api/categories/456')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { id: 456, name: 'Updated Category' },
        message: 'Category updated successfully'
      });
    });

    it('should handle category not found during update', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.updateCategory.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          success: false,
          error: 'Category not found'
        }
      });

      const response = await request(app)
        .put('/api/categories/999')
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });

    it('should handle validation errors during update', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.updateCategory.mockResolvedValueOnce({
        statusCode: 400,
        body: {
          success: false,
          error: 'Category name cannot be empty'
        }
      });

      const response = await request(app)
        .put('/api/categories/1')
        .send({ name: '' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Category name cannot be empty'
      });
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete a category', async () => {
      await request(app)
        .delete('/api/categories/789')
        .expect(204);
      
      // 204 responses typically have no body content
    });

    it('should handle category not found during deletion', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.deleteCategory.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          success: false,
          error: 'Category not found'
        }
      });

      const response = await request(app)
        .delete('/api/categories/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Category not found'
      });
    });

    it('should handle category with associated books', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.deleteCategory.mockResolvedValueOnce({
        statusCode: 409,
        body: {
          success: false,
          error: 'Cannot delete category with associated books'
        }
      });

      const response = await request(app)
        .delete('/api/categories/1')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot delete category with associated books'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle controller method throwing an error', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.listCategories.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        details: 'Database connection failed'
      });
    });

    it('should handle unknown errors', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      categoryController.listCategories.mockRejectedValueOnce('Unknown error');

      const response = await request(app)
        .get('/api/categories')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal server error',
        details: 'Unknown error'
      });
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express handles malformed JSON
      expect(response.status).toBe(400);
    });
  });

  describe('Route Integration', () => {
    it('should properly bind controller methods', async () => {
      const { categoryController } = require('../../../src/controllers/CategoryController');
      
      await request(app).get('/api/categories').expect(200);
      expect(categoryController.listCategories).toHaveBeenCalled();

      await request(app).get('/api/categories/1').expect(200);
      expect(categoryController.getCategory).toHaveBeenCalled();

      await request(app).post('/api/categories').send({ name: 'Test' }).expect(201);
      expect(categoryController.createCategory).toHaveBeenCalled();

      await request(app).put('/api/categories/1').send({ name: 'Test' }).expect(200);
      expect(categoryController.updateCategory).toHaveBeenCalled();

      await request(app).delete('/api/categories/1').expect(204);
      expect(categoryController.deleteCategory).toHaveBeenCalled();
    });
  });
});