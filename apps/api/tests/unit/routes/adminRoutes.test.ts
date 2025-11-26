// ================================================================
// tests/routes/adminRoutes.test.ts
// ================================================================

import request from 'supertest';
import express from 'express';
import adminRoutes from '../../../src/routes/adminRoutes';
import { authMiddleware } from '../../../src/middleware/auth';
import { requirePermission } from '../../../src/middleware/authorization';

// Mock dependencies
/* jest.mock('../../../src/controllers/admin/StatsController', () => ({
  statsController: {
    getSummary: jest.fn(),
    getUserStats: jest.fn(),
    getBookStats: jest.fn(),
  },
})); */
jest.mock('../../../src/controllers/admin/AdminUserController', () => ({
  adminUserController: {
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));
jest.mock('../../../src/controllers/admin/AdminBookController', () => ({
  adminBookController: {
    getAllBooks: jest.fn(),
    getBookById: jest.fn(),
    updateBook: jest.fn(),
    deleteBook: jest.fn(),
  },
}));
jest.mock('../../../src/middleware/auth');
jest.mock('../../../src/middleware/authorization', () => ({
  requirePermission: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));
jest.mock('@my-many-books/shared-auth', () => ({
  ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    MANAGE: 'manage',
  },
  RESOURCES: {
    BOOK: 'Book',
    AUTHOR: 'Author',
    CATEGORY: 'Category',
    USER: 'User',
    ALL: 'all',
  },
}));
jest.mock('../../../src/validation', () => ({
  validateQuery: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  validateBody: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  validateParams: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  adminGetUsersQuerySchema: {},
  adminUpdateUserSchema: {},
  adminGetBooksQuerySchema: {},
  adminUpdateBookSchema: {},
  adminIdParamSchema: {},
  adminStatsQuerySchema: {},
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
  /* let mockStatsController: {
    getSummary: jest.Mock;
    getUserStats: jest.Mock;
    getBookStats: jest.Mock;
  }; */
  let mockAdminUserController: {
    getAllUsers: jest.Mock;
    getUserById: jest.Mock;
    updateUser: jest.Mock;
    deleteUser: jest.Mock;
  };
  let mockAdminBookController: {
    getAllBooks: jest.Mock;
    getBookById: jest.Mock;
    updateBook: jest.Mock;
    deleteBook: jest.Mock;
  };
  let mockAuthMiddleware: jest.MockedFunction<typeof authMiddleware>;
  let mockRequirePermission: jest.MockedFunction<typeof requirePermission>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get the mocked controllers
    // const { statsController } = require('../../../src/controllers/admin/StatsController');
    // mockStatsController = statsController;
    const { adminUserController } = require('../../../src/controllers/admin/AdminUserController');
    mockAdminUserController = adminUserController;
    const { adminBookController } = require('../../../src/controllers/admin/AdminBookController');
    mockAdminBookController = adminBookController;

    // Mock auth middleware to pass through and set an admin user
    mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
    mockAuthMiddleware.mockImplementation(async (req, _res, next) => {
      (req as any).user = { id: 1, email: 'admin@test.com', role: 'admin' };
      next();
    });

    // Mock requirePermission middleware to pass through (returns a middleware function)
    mockRequirePermission = requirePermission as jest.MockedFunction<typeof requirePermission>;
    mockRequirePermission.mockImplementation(() => {
      return async (_req: any, _res: any, next: any) => {
        next();
      };
    });
  });

  /* describe('Stats Endpoints', () => {
    it('GET /stats/summary should call getSummary controller method', async () => {
      mockStatsController.getSummary.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { totalUsers: 10, totalBooks: 50 },
      });

      const response = await request(app)
        .get('/api/admin/stats/summary')
        .expect(200);

      expect(mockStatsController.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { totalUsers: 10, totalBooks: 50 },
      });
    });

    it('GET /stats/users should call getUserStats controller method', async () => {
      mockStatsController.getUserStats.mockResolvedValue({
        statusCode: 501,
        success: false,
        error: 'Not implemented yet',
      });

      const response = await request(app)
        .get('/api/admin/stats/users')
        .expect(501);

      expect(mockStatsController.getUserStats).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: false,
        error: 'Not implemented yet',
      });
    });

    it('GET /stats/books should call getBookStats controller method', async () => {
      mockStatsController.getBookStats.mockResolvedValue({
        statusCode: 501,
        success: false,
        error: 'Not implemented yet',
      });

      const response = await request(app)
        .get('/api/admin/books')
        .expect(501);

      expect(mockStatsController.getBookStats).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: false,
        error: 'Not implemented yet',
      });
    });
  }); */

  describe('User Management Endpoints', () => {
    it('GET /users should call getAllUsers controller method', async () => {
      mockAdminUserController.getAllUsers.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { users: [{ id: 1, name: 'Admin' }] },
      });

      const response = await request(app)
        .get('/api/admin/users')
        .expect(200);

      expect(mockAdminUserController.getAllUsers).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { users: [{ id: 1, name: 'Admin' }] },
      });
    });

    it('GET /users/:id should call getUserById controller method', async () => {
      mockAdminUserController.getUserById.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, name: 'Admin' },
      });

      const response = await request(app)
        .get('/api/admin/users/1')
        .expect(200);

      expect(mockAdminUserController.getUserById).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, name: 'Admin' },
      });
    });

    it('PUT /users/:id should call updateUser controller method', async () => {
      mockAdminUserController.updateUser.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, name: 'Updated Admin' },
      });

      const response = await request(app)
        .put('/api/admin/users/1')
        .send({ name: 'Updated Admin' })
        .expect(200);

      expect(mockAdminUserController.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          body: JSON.stringify({ name: 'Updated Admin' }),
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, name: 'Updated Admin' },
      });
    });

    it('DELETE /users/:id should call deleteUser controller method', async () => {
      mockAdminUserController.deleteUser.mockResolvedValue({
        statusCode: 200,
        success: true,
        message: 'User deleted',
      });

      const response = await request(app)
        .delete('/api/admin/users/1')
        .expect(200);

      expect(mockAdminUserController.deleteUser).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        message: 'User deleted',
      });
    });
  });

  describe('Book Management Endpoints', () => {
    it('GET /books should call getAllBooks controller method', async () => {
      mockAdminBookController.getAllBooks.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { books: [{ id: 1, title: 'Admin Book' }] },
      });

      const response = await request(app)
        .get('/api/admin/books')
        .expect(200);

      expect(mockAdminBookController.getAllBooks).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { books: [{ id: 1, title: 'Admin Book' }] },
      });
    });

    it('GET /books/:id should call getBookById controller method', async () => {
      mockAdminBookController.getBookById.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, title: 'Admin Book' },
      });

      const response = await request(app)
        .get('/api/admin/books/1')
        .expect(200);

      expect(mockAdminBookController.getBookById).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, title: 'Admin Book' },
      });
    });

    it('PUT /books/:id should call updateBook controller method', async () => {
      mockAdminBookController.updateBook.mockResolvedValue({
        statusCode: 200,
        success: true,
        data: { id: 1, title: 'Updated Admin Book' },
      });

      const response = await request(app)
        .put('/api/admin/books/1')
        .send({ title: 'Updated Admin Book' })
        .expect(200);

      expect(mockAdminBookController.updateBook).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          body: JSON.stringify({ title: 'Updated Admin Book' }),
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        data: { id: 1, title: 'Updated Admin Book' },
      });
    });

    it('DELETE /books/:id should call deleteBook controller method', async () => {
      mockAdminBookController.deleteBook.mockResolvedValue({
        statusCode: 200,
        success: true,
        message: 'Book deleted',
      });

      const response = await request(app)
        .delete('/api/admin/books/1')
        .expect(200);

      expect(mockAdminBookController.deleteBook).toHaveBeenCalledWith(
        expect.objectContaining({
          pathParameters: { id: '1' },
          user: { id: 1, email: 'admin@test.com', role: 'admin' },
        })
      );
      expect(response.body).toEqual({
        success: true,
        message: 'Book deleted',
      });
    });
  });

  describe('Authentication and Authorization Middleware', () => {
    it('should require authentication for all admin routes', async () => {
      mockAuthMiddleware.mockImplementation(async (_req, res, _next) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      await request(app).get('/api/admin/stats/summary').expect(401);
      await request(app).get('/api/admin/users').expect(401);
      await request(app).put('/api/admin/books/1').expect(401);
    });

    // Note: Admin role checking is now handled by CASL via requirePermission middleware
    // Integration tests verify proper authorization behavior
  });
});
