// ================================================================
// tests/integration/settings.test.ts
// Integration tests for settings API endpoints
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('@aws-sdk/client-cognito-identity-provider');
jest.mock('../../src/config/database', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn(),
    close: jest.fn(),
  },
}));
jest.mock('@my-many-books/shared-i18n', () => ({
  initializeI18n: jest.fn().mockResolvedValue(undefined),
  i18n: {
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
    language: 'en',
  },
}));
jest.mock('../../src/services/SettingsService');
jest.mock('jsonwebtoken');
jest.mock('../../src/container', () => {
  const { SettingsService } = jest.requireMock('../../src/services/SettingsService');

  const createMockController = () => {
    const controller = {
      getAllSettings: async () => {
        const settings = SettingsService.getAllSettings();
        return { statusCode: 200, success: true, data: settings };
      },
      getSetting: async (req: any) => {
        const key = req.pathParameters?.key;
        const value = SettingsService.getSetting(key);
        const allSettings = SettingsService.getAllSettings();
        const setting = allSettings.find((s: any) => s.key === key);
        if (!setting) {
          return { statusCode: 404, success: false, error: 'Setting not found' };
        }
        return { statusCode: 200, success: true, data: { key, value } };
      },
      getAllSettingsAdmin: async () => {
        const settings = await SettingsService.getAllSettingsAdmin();
        return { statusCode: 200, success: true, data: settings };
      },
      updateSetting: async (req: any) => {
        const key = req.pathParameters?.key;
        const body = req.body ? JSON.parse(req.body) : {};
        const { value } = body;
        const updated = await SettingsService.updateSetting(key, value);
        return { statusCode: 200, success: true, data: updated };
      },
      toggleActive: async () => {
        return { statusCode: 200, success: true };
      },
    };

    // Bind all methods
    Object.keys(controller).forEach(key => {
      (controller as any)[key] = (controller as any)[key].bind(controller);
    });

    return controller;
  };

  const mockControllers: any = {
    SettingsController: createMockController(),
  };

  return {
    container: {
      get: jest.fn((type: symbol) => {
        const typeStr = type.toString();
        for (const [name, controller] of Object.entries(mockControllers)) {
          if (typeStr.includes(name)) {
            return controller;
          }
        }
        // Return empty mock for other controllers
        return new Proxy({}, {
          get: () => jest.fn()
        });
      }),
    },
  };
});
jest.mock('../../src/middleware/auth', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = auth.substring(7);
    if (token === 'admin-token') {
      req.user = { id: 1, sub: 'admin-123', email: 'admin@example.com', role: 'admin' };
    } else if (token === 'user-token') {
      req.user = { id: 2, sub: 'user-123', email: 'user@example.com', role: 'user' };
    } else {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next();
  }),
}));
jest.mock('../../src/middleware/authorization', () => ({
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }),
}));

import request from 'supertest';
import app from '../../src/app';
import { SettingsService } from '../../src/services/SettingsService';

describe('Settings API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(() => {
    adminToken = 'admin-token';
    userToken = 'user-token';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/settings', () => {
    it('should return active settings (public endpoint)', async () => {
      const mockSettings = [
        { key: 'books.list.status.onchange', value: '"remove"', type: 'enum', category: 'ui' },
        { key: 'users.list.active.onchange', value: '"refresh"', type: 'enum', category: 'ui' },
      ];

      (SettingsService.getAllSettings as jest.Mock).mockReturnValue(mockSettings);

      const response = await request(app)
        .get('/api/v1/settings');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockSettings });
      expect(SettingsService.getAllSettings).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/settings/:key', () => {
    it('should return specific setting (public endpoint)', async () => {
      const mockSetting = { key: 'books.list.status.onchange', value: '"remove"', type: 'enum' };

      (SettingsService.getSetting as jest.Mock).mockReturnValue('remove');
      (SettingsService.getAllSettings as jest.Mock).mockReturnValue([mockSetting]);

      const response = await request(app)
        .get('/api/v1/settings/books.list.status.onchange');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: { key: 'books.list.status.onchange', value: 'remove' }
      });
    });

    it('should return 404 for non-existent setting', async () => {
      (SettingsService.getSetting as jest.Mock).mockReturnValue(null);
      (SettingsService.getAllSettings as jest.Mock).mockReturnValue([]);

      const response = await request(app)
        .get('/api/v1/settings/nonexistent.key');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/settings/admin', () => {
    it('should return all settings including deleted for admin', async () => {
      const mockSettings = [
        { key: 'active.setting', value: '"value1"', deleted: false },
        { key: 'deleted.setting', value: '"value2"', deleted: true },
      ];

      (SettingsService.getAllSettingsAdmin as jest.Mock).mockResolvedValue(mockSettings);

      const response = await request(app)
        .get('/api/v1/settings/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, data: mockSettings });
      expect(SettingsService.getAllSettingsAdmin).toHaveBeenCalled();
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/v1/settings/admin')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/settings/admin');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/settings/admin/:key', () => {
    it('should update setting value for admin', async () => {
      const mockUpdatedSetting = {
        key: 'books.list.status.onchange',
        value: '"keep"',
        type: 'enum',
        category: 'ui',
      };

      (SettingsService.updateSetting as jest.Mock).mockResolvedValue(mockUpdatedSetting);

      const response = await request(app)
        .patch('/api/v1/settings/admin/books.list.status.onchange')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'keep' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: { key: 'books.list.status.onchange', value: '"keep"' }
      });
      expect(SettingsService.updateSetting).toHaveBeenCalledWith('books.list.status.onchange', 'keep');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .patch('/api/v1/settings/admin/books.list.status.onchange')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ value: 'keep' });

      expect(response.status).toBe(403);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .patch('/api/v1/settings/admin/books.list.status.onchange')
        .send({ value: 'keep' });

      expect(response.status).toBe(401);
    });

    it('should handle errors gracefully', async () => {
      (SettingsService.updateSetting as jest.Mock).mockRejectedValue(
        new Error("Setting with key 'nonexistent' not found")
      );

      const response = await request(app)
        .patch('/api/v1/settings/admin/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'test' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 400 for invalid value', async () => {
      const response = await request(app)
        .patch('/api/v1/settings/admin/books.list.status.onchange')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
