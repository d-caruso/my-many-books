// ================================================================
// tests/integration/routes/author-category-authorization.integration.test.ts
// Integration Tests for Author & Category Routes Authorization
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('../../../src/models/Author');
jest.mock('../../../src/models/Category');
jest.mock('../../../src/models/Book');
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
import authorRoutes from '../../../src/routes/authorRoutes';
import categoryRoutes from '../../../src/routes/categoryRoutes';
import { Author } from '../../../src/models/Author';
import { Category } from '../../../src/models/Category';
import { Book } from '../../../src/models/Book';

describe('Author & Category Routes Authorization Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/authors', authorRoutes);
    app.use('/api/v1/categories', categoryRoutes);
    jest.clearAllMocks();
    (Author.create as jest.Mock).mockResolvedValue({ id: 1 });
    (Category.create as jest.Mock).mockResolvedValue({ id: 1 });
    (Book.count as jest.Mock).mockResolvedValue(0);
  });

  // ============================================
  // AUTHOR ROUTES AUTHORIZATION
  // ============================================
  describe('Author Routes Authorization', () => {
    describe('POST /api/v1/authors - Create Author', () => {
      it('should allow authenticated user to create author', async () => {
        const response = await request(app)
          .post('/api/v1/authors')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'John',
            surname: 'Doe',
          });

        // We expect either success or an error from the controller (not 403)
        expect(response.status).not.toBe(403);
      });

      it('should deny unauthenticated user from creating author', async () => {
        const response = await request(app)
          .post('/api/v1/authors')
          .send({
            name: 'John',
            surname: 'Doe',
          });

        expect([401, 403]).toContain(response.status);
      });
    });

    describe('PUT /api/v1/authors/:id - Update Author', () => {
      it('should allow user to update own author', async () => {
        const mockAuthor = {
          id: 1,
          name: 'John',
          surname: 'Doe',
          userId: 1,
          update: jest.fn().mockResolvedValue(true),
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
        (Author.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put('/api/v1/authors/1')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Jane',
            surname: 'Doe',
          });

        expect(response.status).not.toBe(403);
      });

      it('should deny user from updating other users author', async () => {
        const mockAuthor = {
          id: 2,
          name: 'Other',
          surname: 'Author',
          userId: 999, // Different user
          update: jest.fn(),
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

        const response = await request(app)
          .put('/api/v1/authors/2')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Hacked',
            surname: 'Name',
          });

        expect(response.status).toBe(403);
      });

      it('should allow admin to update any author', async () => {
        const mockAuthor = {
          id: 1,
          name: 'John',
          surname: 'Doe',
          userId: 1, // Different from admin's ID (999)
          update: jest.fn().mockResolvedValue(true),
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
        (Author.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put('/api/v1/authors/1')
          .set('Authorization', 'Bearer admin-token')
          .send({
            name: 'Updated',
            surname: 'Name',
          });

        expect(response.status).not.toBe(403);
      });
    });

    describe('DELETE /api/v1/authors/:id - Delete Author', () => {
      it('should allow user to delete own author', async () => {
        const mockAuthor = {
          id: 1,
          userId: 1,
          destroy: jest.fn().mockResolvedValue(true),
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
        (Book.count as jest.Mock).mockResolvedValue(0);

        const response = await request(app)
          .delete('/api/v1/authors/1')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).not.toBe(403);
      });

      it('should deny user from deleting other users author', async () => {
        const mockAuthor = {
          id: 2,
          userId: 999, // Different user
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);

        const response = await request(app)
          .delete('/api/v1/authors/2')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(403);
      });

      it('should allow admin to delete any author', async () => {
        const mockAuthor = {
          id: 1,
          userId: 1, // Different from admin's ID (999)
          destroy: jest.fn().mockResolvedValue(true),
        };

        (Author.findByPk as jest.Mock).mockResolvedValue(mockAuthor);
        (Book.count as jest.Mock).mockResolvedValue(0);

        const response = await request(app)
          .delete('/api/v1/authors/1')
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).not.toBe(403);
      });
    });
  });

  // ============================================
  // CATEGORY ROUTES AUTHORIZATION
  // ============================================
  describe('Category Routes Authorization', () => {
    describe('POST /api/v1/categories - Create Category', () => {
      it('should allow authenticated user to create category', async () => {
        const response = await request(app)
          .post('/api/v1/categories')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Fiction',
          });

        expect(response.status).not.toBe(403);
      });

      it('should deny unauthenticated user from creating category', async () => {
        const response = await request(app)
          .post('/api/v1/categories')
          .send({
            name: 'Fiction',
          });

        expect([401, 403]).toContain(response.status);
      });
    });

    describe('PUT /api/v1/categories/:id - Update Category', () => {
      it('should allow user to update own category', async () => {
        const mockCategory = {
          id: 1,
          name: 'Fiction',
          userId: 1,
          update: jest.fn().mockResolvedValue(true),
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
        (Category.findByName as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put('/api/v1/categories/1')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Sci-Fi',
          });

        expect(response.status).not.toBe(403);
      });

      it('should deny user from updating other users category', async () => {
        const mockCategory = {
          id: 2,
          name: 'Other Category',
          userId: 999, // Different user
          update: jest.fn(),
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);

        const response = await request(app)
          .put('/api/v1/categories/2')
          .set('Authorization', 'Bearer valid-token')
          .send({
            name: 'Hacked Category',
          });

        expect(response.status).toBe(403);
      });

      it('should allow admin to update any category', async () => {
        const mockCategory = {
          id: 1,
          name: 'Fiction',
          userId: 1, // Different from admin's ID (999)
          update: jest.fn().mockResolvedValue(true),
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
        (Category.findByName as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put('/api/v1/categories/1')
          .set('Authorization', 'Bearer admin-token')
          .send({
            name: 'Updated Category',
          });

        expect(response.status).not.toBe(403);
      });
    });

    describe('DELETE /api/v1/categories/:id - Delete Category', () => {
      it('should allow user to delete own category', async () => {
        const mockCategory = {
          id: 1,
          userId: 1,
          destroy: jest.fn().mockResolvedValue(true),
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
        (Book.count as jest.Mock).mockResolvedValue(0);

        const response = await request(app)
          .delete('/api/v1/categories/1')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).not.toBe(403);
      });

      it('should deny user from deleting other users category', async () => {
        const mockCategory = {
          id: 2,
          userId: 999, // Different user
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);

        const response = await request(app)
          .delete('/api/v1/categories/2')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(403);
      });

      it('should allow admin to delete any category', async () => {
        const mockCategory = {
          id: 1,
          userId: 1, // Different from admin's ID (999)
          destroy: jest.fn().mockResolvedValue(true),
        };

        (Category.findByPk as jest.Mock).mockResolvedValue(mockCategory);
        (Book.count as jest.Mock).mockResolvedValue(0);

        const response = await request(app)
          .delete('/api/v1/categories/1')
          .set('Authorization', 'Bearer admin-token');

        expect(response.status).not.toBe(403);
      });
    });
  });

  // ============================================
  // UNAUTHORIZED ACCESS TESTS
  // ============================================
  describe('Unauthorized Access', () => {
    it('should deny all write operations without authentication', async () => {
      // Author operations
      let response = await request(app).post('/api/v1/authors').send({ name: 'Test', surname: 'Author' });
      expect([401, 403]).toContain(response.status);

      response = await request(app).put('/api/v1/authors/1').send({ name: 'Test' });
      expect([401, 403]).toContain(response.status);

      response = await request(app).delete('/api/v1/authors/1');
      expect([401, 403]).toContain(response.status);

      // Category operations
      response = await request(app).post('/api/v1/categories').send({ name: 'Test' });
      expect([401, 403]).toContain(response.status);

      response = await request(app).put('/api/v1/categories/1').send({ name: 'Test' });
      expect([401, 403]).toContain(response.status);

      response = await request(app).delete('/api/v1/categories/1');
      expect([401, 403]).toContain(response.status);
    });
  });
});
