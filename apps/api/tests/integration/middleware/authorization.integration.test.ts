// ================================================================
// tests/integration/middleware/authorization.integration.test.ts
// Integration Tests for Authorization Middleware
// ================================================================

import express, { Express } from 'express';
import request from 'supertest';
import { requirePermission } from '../../../src/middleware/authorization';
import { ACTIONS, RESOURCES } from '@my-many-books/shared-auth/authorization';

describe('Authorization Middleware Integration', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Book Routes Protection', () => {
    it('should allow authenticated users to access protected create route', async () => {
      app.post(
        '/books',
        (_req, _res, next) => {
          // Mock auth middleware setting user
          (_req as any).user = {
            id: 1,
            email: 'user@example.com',
            role: 'user',
          };
          next();
        },
        requirePermission(ACTIONS.CREATE, RESOURCES.BOOK),
        (_req, res) => {
          res.status(201).json({ success: true, message: 'Book created' });
        }
      );

      const response = await request(app).post('/books').send({ title: 'Test Book' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should deny unauthenticated users from creating books', async () => {
      app.post(
        '/books',
        (_req, _res, next) => {
          // No user set (anonymous)
          next();
        },
        requirePermission(ACTIONS.CREATE, RESOURCES.BOOK),
        (_req, res) => {
          res.status(201).json({ success: true });
        }
      );

      const response = await request(app).post('/books').send({ title: 'Test Book' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should allow anonymous users to read books', async () => {
      app.get(
        '/books',
        requirePermission(ACTIONS.READ, RESOURCES.BOOK),
        (_req, res) => {
          res.status(200).json({ success: true, books: [] });
        }
      );

      const response = await request(app).get('/books');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Admin Routes Protection', () => {
    it('should allow admins to access admin-only routes', async () => {
      app.get(
        '/admin/users',
        (_req, _res, next) => {
          (_req as any).user = {
            id: 2,
            email: 'admin@example.com',
            role: 'admin',
          };
          next();
        },
        requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
        (_req, res) => {
          res.status(200).json({ success: true, users: [] });
        }
      );

      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny regular users from admin routes', async () => {
      app.get(
        '/admin/users',
        (_req, _res, next) => {
          (_req as any).user = {
            id: 1,
            email: 'user@example.com',
            role: 'user',
          };
          next();
        },
        requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
        (_req, res) => {
          res.status(200).json({ success: true });
        }
      );

      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toMatchObject({
        action: ACTIONS.MANAGE,
        resource: RESOURCES.ALL,
        role: 'user',
      });
    });

    it('should deny anonymous users from admin routes', async () => {
      app.get(
        '/admin/users',
        requirePermission(ACTIONS.MANAGE, RESOURCES.ALL),
        (_req, res) => {
          res.status(200).json({ success: true });
        }
      );

      const response = await request(app).get('/admin/users');

      expect(response.status).toBe(403);
      expect(response.body.details.role).toBe('anonymous');
    });
  });

  describe('Multiple Middleware Chain', () => {
    it('should work correctly in middleware chain', async () => {
      app.post(
        '/books',
        (_req, _res, next) => {
          // Mock authentication
          (_req as any).user = {
            id: 1,
            email: 'user@example.com',
            role: 'user',
          };
          next();
        },
        requirePermission(ACTIONS.CREATE, RESOURCES.BOOK),
        (_req, _res, next) => {
          // Additional middleware
          next();
        },
        (_req, res) => {
          res.status(201).json({ success: true });
        }
      );

      const response = await request(app).post('/books').send({});

      expect(response.status).toBe(201);
    });

    it('should stop middleware chain on permission denial', async () => {
      const finalHandler = jest.fn((_req, res) => {
        res.status(200).json({ success: true });
      });

      app.post(
        '/books',
        requirePermission(ACTIONS.CREATE, RESOURCES.BOOK),
        finalHandler
      );

      await request(app).post('/books').send({});

      // Final handler should not be called
      expect(finalHandler).not.toHaveBeenCalled();
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      app.post(
        '/books',
        requirePermission(ACTIONS.CREATE, RESOURCES.BOOK),
        (_req, res) => {
          res.status(201).json({ success: true });
        }
      );

      const response = await request(app).post('/books').send({});

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        details: {
          action: expect.any(String),
          resource: expect.any(String),
          authenticated: expect.any(Boolean),
          role: expect.any(String),
        },
      });
    });
  });
});
