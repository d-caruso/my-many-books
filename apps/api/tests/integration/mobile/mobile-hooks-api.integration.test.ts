// ================================================================
// tests/integration/mobile/mobile-hooks-api.integration.test.ts
// Integration tests for mobile hooks configuration API endpoints
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
import { MOBILE_APP_SETTING_KEYS, MOBILE_HOOK_SETTING_KEYS } from '@my-many-books/shared-types';
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

describe('Mobile Hooks Configuration API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Mobile Hooks Settings Endpoints', () => {

    describe(`GET ${BASE_PATH}/admin/mobile-hooks/settings/listeners - Get Listener Settings`, () => {
      it('should return listener settings configuration', async () => {
        const mockSettings = [
          { key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED, value: 'true' },
          { key: MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED, value: 'true' },
          { key: MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED, value: 'false' },
          { key: MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL, value: '300' },
          { key: MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS, value: '1000' },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);
        (AppSetting.findOne as jest.Mock).mockResolvedValue({
          updateDate: new Date(),
        });

        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(response.body.data).toHaveProperty('version');
      });

      it('should require admin authorization', async () => {
        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
          .set('Authorization', 'Bearer user-token')
          .expect(403);

        expect(response.body.error).toBe('Forbidden');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
          .expect(401);

        expect(response.body.error).toBe('No authorization header');
      });
    });

    describe(`PUT ${BASE_PATH}/admin/mobile-hooks/settings/listeners - Update Listener Settings`, () => {
      it('should successfully update listener settings', async () => {
        const updateData = {
          analyticsEnabled: false,
          errorReportingEnabled: true,
          batchUploadInterval: 600,
          maxOfflineEvents: 2000,
        };

        const mockSetting = {
          key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('lastUpdated');
      });

      it('should handle partial configuration updates', async () => {
        const partialUpdate = {
          analyticsEnabled: false,
        };

        const mockSetting = {
          key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED, value: 'false' },
          { key: MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED, value: 'true' },
          { key: MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL, value: '300' },
        ]);

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
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
          .put(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('Database connection failed');
      });
    });
  });

  describe('Admin Mobile Hooks Listener Configuration Endpoints', () => {
    describe(`PUT ${BASE_PATH}/admin/mobile-hooks/config/listeners - Update Hook Listeners`, () => {
      it('should persist per-event listener + category toggles', async () => {
        const updateData = {
          listeners: {
            'error.unhandled': { enabled: false },
            'sync.failed': true,
          },
          categories: {
            analytics_listeners: { enabled: false },
          },
        };

        (AppSetting.findOrCreate as jest.Mock).mockImplementation(async ({ where, defaults }) => {
          return [
            {
              key: where.key,
              value: defaults?.value ?? '',
              update: jest.fn().mockResolvedValue(undefined),
            },
          ];
        });

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/config/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');

        const updatedKeys = response.body.data.updated as string[];
        expect(updatedKeys).toEqual(
          expect.arrayContaining([
            'listeners.error.unhandled',
            'listeners.sync.failed',
            'categories.analytics_listeners',
          ])
        );

        const keys = (AppSetting.findOrCreate as jest.Mock).mock.calls.map(call => call[0].where.key);
        expect(keys).toEqual(
          expect.arrayContaining([
            'mobile.hooks.global.listeners.error.unhandled.enabled',
            'mobile.hooks.global.listeners.sync.failed.enabled',
            'mobile.hooks.global.categories.analytics_listeners.enabled',
          ])
        );
      });

      it('should persist performanceMonitoring flag', async () => {
        const updateData = {
          performanceMonitoring: false,
        };

        (AppSetting.findOrCreate as jest.Mock).mockImplementation(async ({ where, defaults }) => {
          return [
            {
              key: where.key,
              value: defaults?.value ?? '',
              update: jest.fn().mockResolvedValue(undefined),
            },
          ];
        });

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/config/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        const updatedKeys = response.body.data.updated as string[];
        expect(updatedKeys).toEqual(
          expect.arrayContaining(['performanceMonitoring'])
        );

        const keys = (AppSetting.findOrCreate as jest.Mock).mock.calls.map(call => call[0].where.key);
        expect(keys).toEqual(
          expect.arrayContaining([
            MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
          ])
        );
      });

      it('should reject invalid listener toggle payloads', async () => {
        const invalidData = {
          listeners: {
            'error.unhandled': { enabled: 'nope' },
          },
        };

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/config/listeners`)
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('errors:invalid_listener_toggle');
      });
    });
  });

  describe('Admin Hook Action Configuration Endpoints', () => {

    describe(`GET ${BASE_PATH}/admin/mobile-hooks/actions-config/mappings - Get Action Mappings`, () => {
      it('should return hook action mappings configuration', async () => {
        const mockSettings = [
          {
            key: MOBILE_HOOK_SETTING_KEYS.ACTIONS_MAPPINGS,
            value: '{"error.unhandled":["email","slack","database"]}',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);
        (AppSetting.findOne as jest.Mock).mockResolvedValue({
          updateDate: new Date(),
        });

        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/actions-config/mappings`)
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('actionSettings');
        expect(response.body.data).toHaveProperty('actions');
        expect(response.body.data).toHaveProperty('availableEvents');
      });

      it('should handle empty hook action configuration', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/actions-config/mappings`)
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('actionSettings');
        expect(response.body.data).toHaveProperty('actions');
      });
    });

    describe(`PUT ${BASE_PATH}/admin/mobile-hooks/actions-config/mappings - Update Action Mappings`, () => {
      it('should successfully update hook action mappings', async () => {
        const updateData = {
          actions: {
            'error.unhandled': ['email', 'slack', 'database'],
            'sync.failed': ['email', 'database'],
          },
        };

        const mockSetting = {
          key: MOBILE_HOOK_SETTING_KEYS.ACTIONS_MAPPINGS,
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/actions-config/mappings`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('config');
      });
    });

    describe(`GET ${BASE_PATH}/admin/mobile-hooks/actions-config/types - Get Action Types`, () => {
      it('should return list of available action types with settings', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .get(`${BASE_PATH}/admin/mobile-hooks/actions-config/types`)
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

    describe(`PUT ${BASE_PATH}/admin/mobile-hooks/actions-config/types/:action_type - Update Action Settings`, () => {
      it('should successfully update settings for specific action type', async () => {
        const updateData = {
          enabled: true,
          recipients: ['test@example.com'],
          rate_limit_minutes: 10,
        };

        const mockSetting = {
          key: `${MOBILE_HOOK_SETTING_KEYS.ACTIONS_SETTINGS}.${ACTION_TYPES.EMAIL}`,
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);
        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}`)
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
          .put(`${BASE_PATH}/admin/mobile-hooks/actions-config/types/invalid_action`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('errors:invalid_action_type');
      });

      it('should validate email rate limit', async () => {
        const invalidData = {
          rate_limit_minutes: 2000, // Exceeds maximum of 1440
        };

        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const response = await request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}`)
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('errors:email_rate_limit_invalid');
      });
    });

    describe(`POST ${BASE_PATH}/admin/mobile-hooks/actions-config/test - Test Config Flow`, () => {
      it('should test full config flow', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const testData = {
          eventType: 'error.unhandled',
          payload: { test: true },
        };

        const response = await request(app)
          .post(`${BASE_PATH}/admin/mobile-hooks/actions-config/test`)
          .set('Authorization', 'Bearer admin-token')
          .send(testData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('eventType');
        expect(response.body.data).toHaveProperty('mappedActions');
        expect(response.body.data).toHaveProperty('summary');
      });
    });

    describe(`POST ${BASE_PATH}/admin/mobile-hooks/actions-config/types/:action_type/test - Test Action Type`, () => {
      it('should test specific action type', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
        (AppSetting.findOne as jest.Mock).mockResolvedValue(null);

        const testData = {
          actionType: ACTION_TYPES.EMAIL,
          dryRun: true,
        };

        const response = await request(app)
          .post(`${BASE_PATH}/admin/mobile-hooks/actions-config/types/${ACTION_TYPES.EMAIL}/test`)
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

  describe('Configuration Performance and Caching', () => {
    it('should handle concurrent admin listener updates gracefully', async () => {
      const updateData = {
        analyticsEnabled: false,
      };

      const mockSetting = {
        key: MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
        value: 'true',
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);
      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

      // Simulate concurrent updates
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .put(`${BASE_PATH}/admin/mobile-hooks/settings/listeners`)
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
