// ================================================================
// tests/integration/mobile/admin-mobile-app-settings.integration.test.ts
// Integration tests for admin mobile app settings validation
// ================================================================

// Mock dependencies BEFORE imports
jest.mock('../../../src/config/database', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      authenticate: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));
jest.mock('@my-many-books/shared-i18n', () => ({
  initializeI18n: jest.fn().mockResolvedValue(undefined),
  i18n: {
    t: jest.fn((key: string) => key),
    changeLanguage: jest.fn(),
    language: 'en',
    isInitialized: true,
  },
}));

// Bypass Joi validateBody so the controller's own validateSettings runs.
// Joi would return a different error format ({ error: 'errors.validation_failed', details: [...] })
// whereas the controller returns the plain message the tests assert on.
jest.mock('../../../src/validation', () => ({
  ...jest.requireActual('../../../src/validation'),
  validateBody: () => (_req: any, _res: any, next: any) => next(),
}));

import request from 'supertest';
import app from '../../../src/app';
import { AppSetting } from '../../../src/models';
import { BASE_PATH } from '../../utils/apiBasePath';

// Mock the models
jest.mock('../../../src/models', () => ({
  ModelManager: {
    initialize: jest.fn(),
    syncDatabase: jest.fn(),
    close: jest.fn(),
  },
  AppSetting: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Mock user based on token
    if (authHeader === 'Bearer admin-token') {
      req.user = {
        id: 'admin_user_456',
        email: 'admin@example.com',
        role: 'admin',
        provider: 'test',
      };
    } else if (authHeader === 'Bearer user-token') {
      req.user = {
        id: 'specific_user_789',
        email: 'user@example.com',
        role: 'user',
        provider: 'test',
      };
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }

    next();
  },
}));

// Mock authorization middleware to allow different access levels
jest.mock('../../../src/middleware/authorization', () => ({
  requirePermission: () => (req: any, res: any, next: any) => {
    // Allow admin users, deny others for admin endpoints
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }
  },
}));

// Mock audit log service
jest.mock('../../../src/services/AuditLogService', () => ({
  getAuditLogService: jest.fn(() => ({
    logActionFromRequest: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Admin Mobile App Settings Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(`PUT ${BASE_PATH}/admin/mobile-app/settings - Settings Validation`, () => {
    it('should validate batch upload interval limits', async () => {
      const invalidData = {
        batchUploadInterval: 30, // Below minimum of 60
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .put(`${BASE_PATH}/admin/mobile-app/settings`)
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain(
        'Batch upload interval must be between 60 and 3600 seconds'
      );
    });

    it('should validate max offline events limits', async () => {
      const invalidData = {
        maxOfflineEvents: 50, // Below minimum of 100
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .put(`${BASE_PATH}/admin/mobile-app/settings`)
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Max offline events must be between 100 and 10000');
    });

    it('should reject oversized batch intervals', async () => {
      const invalidData = {
        batchUploadInterval: 5000, // Above maximum of 3600
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .put(`${BASE_PATH}/admin/mobile-app/settings`)
        .set('Authorization', 'Bearer admin-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain(
        'Batch upload interval must be between 60 and 3600 seconds'
      );
    });
  });
});
