// ================================================================
// tests/integration/mobile/mobile-config-api.integration.test.ts
// Integration tests for mobile configuration API endpoints
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
import { ACTION_TYPES } from '../../../src/controllers/admin/AdminMobileHooksActionsConfigController';

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

describe('Mobile Configuration API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile Hook Configuration Endpoints', () => {

    describe('GET /api/v1/config/mobile - Get Mobile Config (Read-Only)', () => {
      it('should return mobile hook configuration with default values', async () => {
        const mockSettings = [
          {
            key: 'mobile.hooks.analytics.enabled',
            value: 'true',
            category: 'mobile_hooks',
            type: 'boolean',
          },
          {
            key: 'mobile.hooks.errorReporting.enabled',
            value: 'true',
            category: 'mobile_hooks',
            type: 'boolean',
          },
          {
            key: 'mobile.hooks.offlineStorage.enabled',
            value: 'true',
            category: 'mobile_hooks',
            type: 'boolean',
          },
          {
            key: 'mobile.hooks.performanceMonitoring.enabled',
            value: 'false',
            category: 'mobile_hooks',
            type: 'boolean',
          },
          {
            key: 'mobile.hooks.batchUploadInterval',
            value: '300',
            category: 'mobile_hooks',
            type: 'number',
          },
          {
            key: 'mobile.hooks.maxOfflineEvents',
            value: '1000',
            category: 'mobile_hooks',
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
            key: 'mobile.hooks.emergency.enabled',
            value: 'true',
          },
          {
            key: 'mobile.hooks.emergency.reason',
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

  describe('Admin Mobile Hooks Settings Endpoints', () => {

    describe('GET /api/v1/admin/mobile-hooks/settings/listeners - Get Listener Settings', () => {
      it('should return listener settings configuration', async () => {
        const mockSettings = [
          { key: 'mobile.hooks.analytics.enabled', value: 'true' },
          { key: 'mobile.hooks.errorReporting.enabled', value: 'true' },
          { key: 'mobile.hooks.offlineStorage.enabled', value: 'true' },
          { key: 'mobile.hooks.performanceMonitoring.enabled', value: 'false' },
          { key: 'mobile.hooks.batchUploadInterval', value: '300' },
          { key: 'mobile.hooks.maxOfflineEvents', value: '1000' },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);
        (AppSetting.findOne as jest.Mock).mockResolvedValue({
          updateDate: new Date(),
        });

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(response.body.data).toHaveProperty('version');
      });

      it('should require admin authorization', async () => {
        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer user-token')
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/settings/listeners')
          .expect(401);

        expect(response.body.error).toBe('No authorization header');
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/settings/listeners - Update Listener Settings', () => {
      it('should successfully update listener settings', async () => {
        const updateData = {
          analyticsEnabled: false,
          errorReportingEnabled: true,
          batchUploadInterval: 600,
          maxOfflineEvents: 2000,
        };

        const mockSetting = {
          key: 'mobile.hooks.analytics.enabled',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('lastUpdated');
      });

      it('should validate batch upload interval limits', async () => {
        const invalidData = {
          batchUploadInterval: 30, // Below minimum of 60
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch upload interval must be between 60 and 3600 seconds');
      });

      it('should validate max offline events limits', async () => {
        const invalidData = {
          maxOfflineEvents: 50, // Below minimum of 100
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Max offline events must be between 100 and 10000');
      });

      it('should reject oversized batch intervals', async () => {
        const invalidData = {
          batchUploadInterval: 5000, // Above maximum of 3600
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch upload interval must be between 60 and 3600 seconds');
      });

      it('should handle partial configuration updates', async () => {
        const partialUpdate = {
          analyticsEnabled: false,
        };

        const mockSetting = {
          key: 'mobile.hooks.analytics.enabled',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: 'mobile.hooks.analytics.enabled', value: 'false' },
          { key: 'mobile.hooks.errorReporting.enabled', value: 'true' },
          { key: 'mobile.hooks.batchUploadInterval', value: '300' },
        ]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toContain('analyticsEnabled');
      });

      it('should handle database errors during configuration updates', async () => {
        const updateData = {
          analyticsEnabled: false,
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOrCreate as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Database connection failed');
      });
    });
  });

  describe('Admin Hook Action Configuration Endpoints', () => {

    describe('GET /api/v1/admin/mobile-hooks/actions-config/mappings - Get Action Mappings', () => {
      it('should return hook action mappings configuration', async () => {
        const mockSettings = [
          {
            key: 'mobile.hooks.actions.mappings',
            value: '{"error.unhandled":["email","slack","database"]}',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);
        (AppSetting.findOne as jest.Mock).mockResolvedValue({
          updateDate: new Date(),
        });

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/actions-config/mappings')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_settings');
        expect(response.body.data).toHaveProperty('actions');
        expect(response.body.data).toHaveProperty('available_events');
      });

      it('should handle empty hook action configuration', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/actions-config/mappings')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_settings');
        expect(response.body.data).toHaveProperty('actions');
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/actions-config/mappings - Update Action Mappings', () => {
      it('should successfully update hook action mappings', async () => {
        const updateData = {
          actions: {
            'error.unhandled': ['email', 'slack', 'database'],
            'sync.failed': ['email', 'database'],
          },
        };

        const mockSetting = {
          key: 'mobile.hooks.actions.mappings',
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/actions-config/mappings')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('config');
      });
    });

    describe('GET /api/v1/admin/mobile-hooks/actions-config/types - Get Action Types', () => {
      it('should return list of available action types with settings', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/actions-config/types')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('actions');

        // Should include all action types
        const actions = response.body.data.actions;
        expect(actions).toHaveProperty(ACTION_TYPES.EMAIL);
        expect(actions).toHaveProperty(ACTION_TYPES.SLACK);
        expect(actions).toHaveProperty(ACTION_TYPES.WEBHOOK);
        expect(actions).toHaveProperty(ACTION_TYPES.DATABASE);
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/actions-config/types/:action_type - Update Action Settings', () => {
      it('should successfully update settings for specific action type', async () => {
        const updateData = {
          enabled: true,
          recipients: ['test@example.com'],
          rate_limit_minutes: 10,
        };

        const mockSetting = {
          key: `mobile.hooks.actions.settings.${ACTION_TYPES.EMAIL}`,
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put(`/api/v1/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_type', ACTION_TYPES.EMAIL);
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data).toHaveProperty('updated');
      });

      it('should validate action type exists', async () => {
        const updateData = {
          enabled: true,
        };

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/actions-config/types/invalid_action')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid action type');
      });

      it('should validate email rate limit', async () => {
        const invalidData = {
          rate_limit_minutes: 2000, // Exceeds maximum of 1440
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put(`/api/v1/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}`)
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Email rate limit must be between 1 and 1440 minutes');
      });
    });

    describe('POST /api/v1/admin/mobile-hooks/actions-config/test - Test Config Flow', () => {
      it('should test full config flow', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const testData = {
          eventType: 'error.unhandled',
          payload: { test: true },
        };

        const response = await request(app)
          .post('/api/v1/admin/mobile-hooks/actions-config/test')
          .set('Authorization', 'Bearer admin-token')
          .send(testData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('eventType');
        expect(response.body.data).toHaveProperty('mappedActions');
        expect(response.body.data).toHaveProperty('summary');
      });
    });

    describe('POST /api/v1/admin/mobile-hooks/actions-config/types/:action_type/test - Test Action Type', () => {
      it('should test specific action type', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const testData = {
          actionType: ACTION_TYPES.EMAIL,
          dryRun: true,
        };

        const response = await request(app)
          .post(`/api/v1/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}/test`)
          .set('Authorization', 'Bearer admin-token')
          .send(testData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('actionType');
        expect(response.body.data).toHaveProperty('dryRun', true);
        expect(response.body.data).toHaveProperty('execution');
      });
    });
  });

  describe('User-Specific Mobile Configuration Endpoints', () => {

    describe('GET /api/v1/users/:id/mobile-config - Get User Mobile Config', () => {
      it('should return error when user ID is missing from request', async () => {
        const mockSettings: any[] = [];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });
    });

    describe('PUT /api/v1/users/:id/mobile-config - Update User Mobile Config', () => {
      it('should return error when user ID is missing from request', async () => {
        const updateData = {
          analyticsEnabled: false,
        };

        const response = await request(app)
          .put('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
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

    it('should handle concurrent admin listener updates gracefully', async () => {
      const updateData = {
        analyticsEnabled: false,
      };

      const mockSetting = {
        key: 'mobile.hooks.analytics.enabled',
        value: 'true',
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

      // Simulate concurrent updates
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .put('/api/v1/admin/mobile-hooks/settings/listeners')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
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
