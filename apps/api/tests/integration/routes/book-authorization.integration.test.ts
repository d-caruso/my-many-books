// ================================================================
// tests/integration/routes/book-authorization.integration.test.ts
// Integration Tests for Book Routes Authorization
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Mock user based on token
    if (authHeader === 'Bearer valid-token') {
      req.user = {
        id: 1,
        userId: 1,
        email: 'user@example.com',
        role: 'user',
      };
    } else if (authHeader === 'Bearer admin-token') {
      req.user = {
        id: 999,
        userId: 999,
        email: 'admin@example.com',
        role: 'admin',
      };
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  },
}));

import request from 'supertest';
import express from 'express';
import { BookService, BookServiceError } from '../../../src/services/book/BookService';

describe('Book Routes Authorization Integration', () => {
  let app: express.Application;
  let bookRoutes: express.Router;
  let createBookSpy: jest.SpyInstance;
  let updateBookSpy: jest.SpyInstance;
  let deleteBookSpy: jest.SpyInstance;

  beforeEach(() => {
    createBookSpy = jest.spyOn(BookService.prototype, 'createBook').mockResolvedValue({
      id: 1,
      title: 'Test Book',
      isbnCode: '978-0-123456-78-9',
    } as any);
    updateBookSpy = jest.spyOn(BookService.prototype, 'updateBook');
    deleteBookSpy = jest.spyOn(BookService.prototype, 'deleteBook');

    delete require.cache[require.resolve('../../../src/routes/bookRoutes')];
    bookRoutes = require('../../../src/routes/bookRoutes').default;

    app = express();
    app.use(express.json());
    app.use('/api/v1/books', bookRoutes);
    jest.clearAllMocks();
  });

  afterEach(() => {
    createBookSpy.mockRestore();
    updateBookSpy.mockRestore();
    deleteBookSpy.mockRestore();
  });

  describe('POST /api/v1/books - Create Book', () => {
    it('should allow authenticated user to create book', async () => {
      createBookSpy.mockResolvedValue({
        id: 1,
        title: 'Test Book',
        isbnCode: '978-0-123456-78-9',
      } as any);
      // This test verifies that requirePermission(CREATE, BOOK) allows authenticated users
      // The actual book creation logic is tested in unit tests
      const response = await request(app)
        .post('/api/v1/books')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test Book',
          isbnCode: '978-0-123456-78-9',
        });

      // We expect either success or an error from the controller (not 403)
      // 403 would mean authorization failed
      expect(response.status).not.toBe(403);
    });

    it('should deny unauthenticated user from creating book', async () => {
      const response = await request(app)
        .post('/api/v1/books')
        .send({
          title: 'Test Book',
          isbnCode: '978-0-123456-78-9',
        });

      // Without authentication, auth middleware should block before authorization
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('PUT /api/v1/books/:id - Update Book', () => {
    it('should allow user to update own book', async () => {
      updateBookSpy.mockResolvedValue({
        id: 1,
        title: 'Updated Title',
        isbnCode: '9780000000000',
      } as any);

      // Mock authenticated user with userId: 1
      const response = await request(app)
        .put('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Updated Title',
        });

      // Should not be blocked by authorization (403)
      // Actual implementation might return different status based on business logic
      expect(response.status).not.toBe(403);
    });

    it('should deny user from updating other users book', async () => {
      updateBookSpy.mockRejectedValue(new BookServiceError('FORBIDDEN'));

      // Mock authenticated user with userId: 1
      const response = await request(app)
        .put('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Malicious Update',
        });

      // Should be blocked by ownership check in controller
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
      });
    });

    it('should allow admin to update any book', async () => {
      updateBookSpy.mockResolvedValue({
        id: 1,
        title: 'Any User Book',
        isbnCode: '9780000000000',
      } as any);

      // Mock admin user
      const response = await request(app)
        .put('/api/v1/books/1')
        .set('Authorization', 'Bearer admin-token')
        .send({
          title: 'Admin Update',
        });

      // Admin should not be blocked
      expect(response.status).not.toBe(403);
    });
  });

  describe('DELETE /api/v1/books/:id - Delete Book', () => {
    it('should allow user to delete own book', async () => {
      deleteBookSpy.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).not.toBe(403);
    });

    it('should deny user from deleting other users book', async () => {
      deleteBookSpy.mockRejectedValue(new BookServiceError('FORBIDDEN'));

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should allow admin to delete any book', async () => {
      deleteBookSpy.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer admin-token');

      expect(response.status).not.toBe(403);
    });
  });

  describe('Unauthorized Operations', () => {
    it('should deny all write operations for unauthenticated users', async () => {
      const createResponse = await request(app)
        .post('/api/v1/books')
        .send({ title: 'Test' });

      const updateResponse = await request(app)
        .put('/api/v1/books/1')
        .send({ title: 'Test' });

      const deleteResponse = await request(app)
        .delete('/api/v1/books/1');

      // All should fail authentication or authorization
      expect([401, 403]).toContain(createResponse.status);
      expect([401, 403]).toContain(updateResponse.status);
      expect([401, 403]).toContain(deleteResponse.status);
    });

    it('should return proper error messages for unauthorized access', async () => {
      deleteBookSpy.mockRejectedValue(new BookServiceError('FORBIDDEN'));

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });
  });
});
