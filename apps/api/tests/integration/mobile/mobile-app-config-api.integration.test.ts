// ================================================================
// tests/integration/mobile/mobile-app-config-api.integration.test.ts
// Integration tests for mobile app configuration API endpoints
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

import request from 'supertest';
import app from '../../../src/app';
import { AppSetting } from '../../../src/models';
import { MOBILE_HOOK_SETTING_KEYS, MOBILE_APP_SETTING_KEYS, MOBILE_HOOKS_METADATA } from '@my-many-books/shared-types';

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

describe('Mobile App Configuration API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile App Configuration Endpoints', () => {

    describe('GET /api/v1/config/mobile - Get Mobile Config (Read-Only)', () => {
      it('should return mobile hook configuration with default values', async () => {
        const mockSettings = [
          {
            key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
            value: 'true',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'boolean',
          },
          {
            key: MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
            value: 'true',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'boolean',
          },
          {
            key: MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
            value: 'true',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'boolean',
          },
          {
            key: MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
            value: 'false',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'boolean',
          },
          {
            key: MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
            value: '300',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'number',
          },
          {
            key: MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS,
            value: '1000',
            category: MOBILE_HOOKS_METADATA.CATEGORY,
            type: 'number',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/config/mobile')
          .expect(200);

        expect(response.body.success).toBe(true);
        // Response now uses camelCase
        expect(response.body.data).toHaveProperty('analyticsEnabled');
        expect(response.body.data).toHaveProperty('errorReportingEnabled');
        expect(response.body.data).toHaveProperty('batchUploadInterval');
        expect(response.body.data).toHaveProperty('maxOfflineEvents');
      });

      it('should handle missing configuration settings gracefully with defaults', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/config/mobile')
          .expect(200);

        expect(response.body.success).toBe(true);

        // Should return default values with camelCase
        expect(response.body.data).toHaveProperty('analyticsEnabled', true);
        expect(response.body.data).toHaveProperty('errorReportingEnabled', true);
        expect(response.body.data).toHaveProperty('batchUploadInterval', 300);
        expect(response.body.data).toHaveProperty('maxOfflineEvents', 1000);
        expect(response.body.data).toHaveProperty('offlineStorageEnabled', true);
        expect(response.body.data).toHaveProperty('performanceMonitoringEnabled', true);
        expect(response.body.data).toHaveProperty('emergencyEnabled', false);
        expect(response.body.data).toHaveProperty('emergencyReason', null);
      });

      it('should return emergency status fields', async () => {
        const mockSettings = [
          {
            key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED,
            value: 'true',
          },
          {
            key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON,
            value: 'Maintenance mode',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/config/mobile')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('emergencyEnabled');
        expect(response.body.data).toHaveProperty('emergencyReason');
      });
    });
  });

  describe('User-Specific Mobile Configuration Endpoints', () => {

    describe('GET /api/v1/users/:id/mobile-config - Get User Mobile Config', () => {
      it('should return access denied when accessing another user config', async () => {
        const mockSettings: any[] = [];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        // user-token authenticates as 'specific_user_789', but trying to access 'other_user_999'
        const response = await request(app)
          .get('/api/v1/users/other_user_999/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('errors:access_denied');
      });
    });

    describe('PUT /api/v1/users/:id/mobile-config - Update User Mobile Config', () => {
      it('should return access denied when updating another user config', async () => {
        const updateData = {
          analyticsEnabled: false,
        };

        // user-token authenticates as 'specific_user_789', but trying to update 'other_user_999'
        const response = await request(app)
          .put('/api/v1/users/other_user_999/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('errors:access_denied');
      });
    });
  });

  describe('Configuration Performance and Caching', () => {
    it('should handle concurrent configuration reads gracefully', async () => {
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      // Simulate concurrent reads
      const promises = Array(5).fill(null).map(() =>
        request(app).get('/api/v1/config/mobile')
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
