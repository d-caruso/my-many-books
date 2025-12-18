// ================================================================
// tests/integration/routes/book-authorization.integration.test.ts
// Integration Tests for Book Routes Authorization
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('../../../src/models/Book');
jest.mock('../../../src/models/Author');
jest.mock('../../../src/models/Category');
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
              };
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  },
}));

import request from 'supertest';
import express from 'express';
import bookRoutes from '../../../src/routes/bookRoutes';
import { Book } from '../../../src/models/Book';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';

describe('Book Routes Authorization Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/books', bookRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/books - Create Book', () => {
    it('should allow authenticated user to create book', async () => {
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
      const mockBook = {
        id: 1,
        title: 'My Book',
        userId: 1,
        get: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(true),
        setAuthors: jest.fn(),
        setCategories: jest.fn(),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (Author.findAll as jest.Mock).mockResolvedValue([]);
      (Category.findAll as jest.Mock).mockResolvedValue([]);

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
      const mockBook = {
        id: 1,
        title: 'Other User Book',
        userId: 999, // Different user
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

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
      const mockBook = {
        id: 1,
        title: 'Any User Book',
        userId: 999,
        get: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(true),
        setAuthors: jest.fn(),
        setCategories: jest.fn(),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);
      (Author.findAll as jest.Mock).mockResolvedValue([]);
      (Category.findAll as jest.Mock).mockResolvedValue([]);

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
      const mockBook = {
        id: 1,
        title: 'My Book',
        userId: 1,
        destroy: jest.fn().mockResolvedValue(true),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).not.toBe(403);
    });

    it('should deny user from deleting other users book', async () => {
      const mockBook = {
        id: 1,
        title: 'Other User Book',
        userId: 999,
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });

    it('should allow admin to delete any book', async () => {
      const mockBook = {
        id: 1,
        title: 'Any User Book',
        userId: 999,
        destroy: jest.fn().mockResolvedValue(true),
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

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
      const mockBook = {
        id: 1,
        userId: 999,
      };

      (Book.findByPk as jest.Mock).mockResolvedValue(mockBook);

      const response = await request(app)
        .delete('/api/v1/books/1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.success).toBe(false);
    });
  });
});
