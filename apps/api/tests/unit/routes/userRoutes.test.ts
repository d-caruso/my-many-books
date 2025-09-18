// ================================================================
// tests/routes/userRoutes.test.ts
// Comprehensive tests for User routes
// ================================================================

import request from 'supertest';
import express from 'express';
import userRoutes from '../../../src/routes/userRoutes';

// Mock the UserController
jest.mock('../../../src/controllers/UserController', () => ({
  UserController: {
    getCurrentUser: jest.fn(async (req, res) => {
      res.status(200).json({
        id: req.user?.userId || 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        fullName: 'John Doe',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }),
    updateCurrentUser: jest.fn(async (req, res) => {
      res.status(200).json({
        id: req.user?.userId || 1,
        email: 'test@example.com',
        name: req.body.name || 'Updated',
        surname: req.body.surname || 'User',
        fullName: `${req.body.name || 'Updated'} ${req.body.surname || 'User'}`,
        isActive: true,
        updatedAt: new Date()
      });
    }),
    deleteAccount: jest.fn(async (_req, res) => {
      res.status(200).json({
        message: 'Account deleted successfully',
        note: 'All personal data has been removed. Books will remain anonymized in the system.'
      });
    }),
    getUserBooks: jest.fn(async (_req, res) => {
      res.status(200).json({
        books: [
          { id: 1, title: 'Book 1', isbnCode: '123456' },
          { id: 2, title: 'Book 2', isbnCode: '789012' }
        ],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 2, itemsPerPage: 10 }
      });
    }),
    getUserStats: jest.fn(async (_req, res) => {
      res.status(200).json({
        totalBooks: 2,
        booksByStatus: {
          inProgress: 1,
          paused: 0,
          finished: 1,
          unspecified: 0
        },
        completionRate: 50,
        recentBooks: []
      });
    }),
    deactivateAccount: jest.fn(async (_req, res) => {
      res.status(200).json({
        message: 'Account deactivated successfully',
        note: 'Your books will remain in the system but will no longer be accessible'
      });
    })
  }
}));

// Mock auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 1, email: 'test@example.com' };
    next();
  })
}));

describe('User Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);
  });

  describe('GET /api/users', () => {
    it('should get current user information', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: 1,
        email: 'test@example.com',
        name: 'John',
        surname: 'Doe',
        fullName: 'John Doe',
        isActive: true
      }));
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });

  describe('PUT /api/users', () => {
    it('should update current user information', async () => {
      const updateData = {
        name: 'Updated',
        surname: 'User'
      };

      const response = await request(app)
        .put('/api/users')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        id: 1,
        email: 'test@example.com',
        name: 'Updated',
        surname: 'User',
        fullName: 'Updated User',
        isActive: true
      }));
    });

    it('should handle validation errors', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      UserController.updateCurrentUser.mockImplementationOnce(async (_req: any, res: any) => {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
      });

      const response = await request(app)
        .put('/api/users')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid email format'
      });
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .put('/api/users')
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('DELETE /api/users', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/users')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Account deleted successfully',
        note: 'All personal data has been removed. Books will remain anonymized in the system.'
      });
    });

    it('should handle deletion errors', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      UserController.deleteAccount.mockImplementationOnce(async (_req: any, res: any) => {
        res.status(409).json({
          success: false,
          error: 'Cannot delete account with active subscriptions'
        });
      });

      const response = await request(app)
        .delete('/api/users')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Cannot delete account with active subscriptions'
      });
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .delete('/api/users')
        .expect(401);
    });
  });

  describe('GET /api/users/books', () => {
    it('should get user books', async () => {
      const response = await request(app)
        .get('/api/users/books')
        .expect(200);

      expect(response.body).toEqual({
        books: [
          { id: 1, title: 'Book 1', isbnCode: '123456' },
          { id: 2, title: 'Book 2', isbnCode: '789012' }
        ],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 2, itemsPerPage: 10 }
      });
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/books?page=2&limit=5')
        .expect(200);

      expect(response.body.books).toBeDefined();
    });

    it('should handle user with no books', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      UserController.getUserBooks.mockImplementationOnce(async (_req: any, res: any) => {
        res.status(200).json({
          books: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10 }
        });
      });

      const response = await request(app)
        .get('/api/users/books')
        .expect(200);

      expect(response.body.books).toEqual([]);
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/users/books')
        .expect(401);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .expect(200);

      expect(response.body).toEqual({
        totalBooks: 2,
        booksByStatus: {
          inProgress: 1,
          paused: 0,
          finished: 1,
          unspecified: 0
        },
        completionRate: 50,
        recentBooks: []
      });
    });

    it('should handle user with no statistics', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      UserController.getUserStats.mockImplementationOnce(async (_req: any, res: any) => {
        res.status(200).json({
          totalBooks: 0,
          booksByStatus: {
            inProgress: 0,
            paused: 0,
            finished: 0,
            unspecified: 0
          },
          completionRate: 0,
          recentBooks: []
        });
      });

      const response = await request(app)
        .get('/api/users/stats')
        .expect(200);

      expect(response.body.totalBooks).toBe(0);
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/users/stats')
        .expect(401);
    });
  });

  describe('PATCH /api/users', () => {
    it('should deactivate user account', async () => {
      const response = await request(app)
        .patch('/api/users')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Account deactivated successfully',
        note: 'Your books will remain in the system but will no longer be accessible'
      });
    });

    it('should handle already deactivated account', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      UserController.deactivateAccount.mockImplementationOnce(async (_req: any, res: any) => {
        res.status(409).json({
          success: false,
          error: 'Account is already deactivated'
        });
      });

      const response = await request(app)
        .patch('/api/users')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Account is already deactivated'
      });
    });

    it('should require authentication', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      authMiddleware.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app)
        .patch('/api/users')
        .expect(401);
    });
  });

  describe('Route Integration', () => {
    it('should properly bind all controller methods', async () => {
      const { UserController } = require('../../../src/controllers/UserController');
      
      // Test all routes to ensure they're properly bound
      await request(app).get('/api/users').expect(200);
      expect(UserController.getCurrentUser).toHaveBeenCalled();

      await request(app).put('/api/users').send({ name: 'Test' }).expect(200);
      expect(UserController.updateCurrentUser).toHaveBeenCalled();

      await request(app).delete('/api/users').expect(200);
      expect(UserController.deleteAccount).toHaveBeenCalled();

      await request(app).get('/api/users/books').expect(200);
      expect(UserController.getUserBooks).toHaveBeenCalled();

      await request(app).get('/api/users/stats').expect(200);
      expect(UserController.getUserStats).toHaveBeenCalled();

      await request(app).patch('/api/users').expect(200);
      expect(UserController.deactivateAccount).toHaveBeenCalled();
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .put('/api/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      // Express handles malformed JSON
      expect(response.status).toBe(400);
    });
  });

  describe('Authentication Middleware', () => {
    it('should apply authentication to all routes', async () => {
      const { authMiddleware } = require('../../../src/middleware/auth');
      
      // Mock to reject all requests
      authMiddleware.mockImplementation((_req: any, res: any, _next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      // Test that all routes require authentication
      await request(app).get('/api/users').expect(401);
      await request(app).put('/api/users').expect(401);
      await request(app).delete('/api/users').expect(401);
      await request(app).get('/api/users/books').expect(401);
      await request(app).get('/api/users/stats').expect(401);
      await request(app).patch('/api/users').expect(401);
    });
  });
});