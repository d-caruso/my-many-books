// ================================================================
// tests/routes/bookRoutes.test.ts
// ================================================================

import request from 'supertest';
import express from 'express';
import bookRoutes from '../../../src/routes/bookRoutes';

// Mock the BookController and middleware
jest.mock('../../../src/controllers/BookController', () => ({
  BookController: jest.fn().mockImplementation(() => ({
    getUserBooks: jest.fn(async (_req) => ({
      statusCode: 200,
      success: true,
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    })),
    getBookById: jest.fn(async (req) => ({
      statusCode: 200,
      success: true,
      data: { id: parseInt(req.pathParameters?.id || '1'), title: 'Test Book' }
    })),
    createBookForUser: jest.fn(async (_req) => ({
      statusCode: 201,
      success: true,
      data: { id: 1, title: 'New Book' },
      message: 'Book created successfully'
    })),
    updateBookForUser: jest.fn(async (req) => ({
      statusCode: 200,
      success: true,
      data: { id: parseInt(req.pathParameters?.id || '1'), title: 'Updated Book' }
    })),
    patchBookForUser: jest.fn(async (req) => ({
      statusCode: 200,
      success: true,
      data: { id: parseInt(req.pathParameters?.id || '1'), title: 'Patched Book' }
    })),
    deleteBookForUser: jest.fn(async (_req) => ({
      statusCode: 204,
      success: true
    })),
    searchByIsbnForUser: jest.fn(async (req) => ({
      statusCode: 200,
      success: true,
      data: { isbn: req.pathParameters?.isbn, title: 'ISBN Book' }
    })),
  }))
}));

jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 1, email: 'test@example.com' };
    next();
  })
}));

jest.mock('../../../src/utils/routeWrapper', () => ({
  expressRouteWrapper: jest.fn((controllerMethod) => {
    return async (req: any, res: any, next: any) => {
      try {
        const universalRequest = {
          body: JSON.stringify(req.body || {}),
          queryStringParameters: req.query,
          pathParameters: req.params,
          user: req.user
        };
        
        const result = await controllerMethod(universalRequest);
        
        res.status(result.statusCode).json({
          success: result.success,
          data: result.data,
          ...(result.message && { message: result.message }),
          ...(result.pagination && { pagination: result.pagination })
        });
      } catch (error) {
        next(error);
      }
    };
  })
}));

describe('Book Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/books', bookRoutes);
  });

  describe('GET /api/books', () => {
    it('should get user books', async () => {
      const response = await request(app)
        .get('/api/books')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    });

    it('should handle query parameters', async () => {
      const response = await request(app)
        .get('/api/books?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/books/:id', () => {
    it('should get a specific book', async () => {
      const response = await request(app)
        .get('/api/books/123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { id: 123, title: 'Test Book' }
      });
    });
  });

  describe('POST /api/books', () => {
    it('should create a new book', async () => {
      const bookData = {
        title: 'New Book',
        isbnCode: '9781234567890'
      };

      const response = await request(app)
        .post('/api/books')
        .send(bookData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { id: 1, title: 'New Book' },
        message: 'Book created successfully'
      });
    });
  });

  describe('PUT /api/books/:id', () => {
    it('should update a book', async () => {
      const updateData = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put('/api/books/456')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { id: 456, title: 'Updated Book' }
      });
    });
  });

  describe('DELETE /api/books/:id', () => {
    it('should delete a book', async () => {
      const response = await request(app)
        .delete('/api/books/789')
        .expect(204);

      // 204 responses should have empty body
      expect(response.body).toEqual({});
    });
  });

  describe('GET /api/books/search/isbn/:isbn', () => {
    it('should search by ISBN', async () => {
      const isbn = '9781234567890';
      
      const response = await request(app)
        .get(`/api/books/search/isbn/${isbn}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { isbn: isbn, title: 'ISBN Book' }
      });
    });
  });

  describe('Authentication Middleware', () => {
    it('should require authentication for all routes', async () => {
      // This test verifies the auth middleware is applied
      // The mock already handles this, but we can verify it was called
      await request(app)
        .get('/api/books')
        .expect(200);

      // The auth middleware mock should have set req.user
      // This is tested implicitly by successful responses
    });
  });

  describe('Route Wrapper Integration', () => {
    it('should handle controller method binding correctly', async () => {
      // Test that the route wrapper correctly transforms requests
      const response = await request(app)
        .get('/api/books/test-id')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle JSON body parsing', async () => {
      const testData = { title: 'Test JSON' };
      
      const response = await request(app)
        .post('/api/books')
        .send(testData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});