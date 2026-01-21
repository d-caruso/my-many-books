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

    describe('GET /api/v1/config/mobile - Get Mobile Config', () => {
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
        expect(response.body.data).toHaveProperty('analytics_enabled', true);
        expect(response.body.data).toHaveProperty('error_reporting_enabled', true);
        expect(response.body.data).toHaveProperty('batch_upload_interval', 300);
        expect(response.body.data).toHaveProperty('max_offline_events', 1000);
      });


      it('should handle missing configuration settings gracefully', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/config/mobile')
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Should return default values
        expect(response.body.data).toHaveProperty('analytics_enabled', true);
        expect(response.body.data).toHaveProperty('error_reporting_enabled', true);
        expect(response.body.data).toHaveProperty('batch_upload_interval', 300);
        expect(response.body.data).toHaveProperty('max_offline_events', 1000);
      });
    });

    describe('PUT /api/v1/config/mobile - Update Mobile Config', () => {
      it('should successfully update mobile hook configuration', async () => {
        const updateData = {
          analytics_enabled: false,
          error_reporting_enabled: true,
          batch_upload_interval: 600,
          max_offline_events: 2000,
        };

        const mockSetting = {
          key: 'mobile.hooks.analytics.enabled',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/config/mobile')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('config');
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('lastUpdated');
        expect(response.body.data.updated).toContain('analytics_enabled');

        // Verify settings were updated
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'mobile.hooks.analytics.enabled' },
            defaults: expect.objectContaining({
              value: 'false',
              category: 'mobile_hooks',
            }),
          })
        );
      });

      it('should validate batch upload interval limits', async () => {
        const invalidData = {
          batch_upload_interval: 30, // Below minimum of 60
        };

        const response = await request(app)
          .put('/api/v1/config/mobile')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch upload interval must be between 60 and 3600 seconds');
      });

      it('should validate max offline events limits', async () => {
        const invalidData = {
          max_offline_events: 50, // Below minimum of 100
        };

        const response = await request(app)
          .put('/api/v1/config/mobile')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Max offline events must be between 100 and 10000');
      });

      it('should reject oversized batch intervals', async () => {
        const invalidData = {
          batch_upload_interval: 5000, // Above maximum of 3600
        };

        const response = await request(app)
          .put('/api/v1/config/mobile')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Batch upload interval must be between 60 and 3600 seconds');
      });

      it('should handle partial configuration updates', async () => {
        const partialUpdate = {
          analytics_enabled: false,
          // Only updating one field
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
          .put('/api/v1/config/mobile')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toEqual(['analytics_enabled']);
        expect(AppSetting.findOrCreate).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors during configuration updates', async () => {
        const updateData = {
          analytics_enabled: false,
        };

        (AppSetting.findOrCreate as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(app)
          .put('/api/v1/config/mobile')
          .send(updateData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Database connection failed');
      });
    });
  });

  describe('Admin Hook Action Configuration Endpoints', () => {

    describe('GET /api/v1/admin/mobile-hooks/config - Get Hook Action Config', () => {
      it('should return hook action mappings configuration', async () => {
        const mockSettings = [
          {
            key: 'mobile.hooks.actions.analytics.create',
            value: '{"actionType":"log","priority":10,"enabled":true}',
          },
          {
            key: 'mobile.hooks.actions.analytics.error',
            value: '{"actionType":"alert","priority":1,"enabled":true}',
          },
          {
            key: 'mobile.hooks.actions.sync.conflict',
            value: '{"actionType":"notification","priority":5,"enabled":true}',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/config')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_settings');
        expect(response.body.data).toHaveProperty('actions');
        expect(response.body.data).toHaveProperty('available_events');
      });

      it('should handle empty hook action configuration', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/config')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_settings');
        expect(response.body.data).toHaveProperty('actions');
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/config - Update Hook Action Config', () => {
      it('should successfully update hook action mappings', async () => {
        const updateData = {
          action_mappings: {
            analytics: {
              create: { actionType: 'log', priority: 10, enabled: true },
              error: { actionType: 'alert', priority: 1, enabled: true },
            },
            sync: {
              conflict: { actionType: 'notification', priority: 5, enabled: false },
            },
          },
        };

        const mockSetting = {
          key: 'mobile.hooks.actions.analytics.create',
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/config')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data).toHaveProperty('config');
      });

      it('should validate action mapping structure', async () => {
        const invalidData = {
          action_mappings: {
            analytics: {
              create: { 
                // Missing required actionType
                priority: 10, 
                enabled: true 
              },
            },
          },
        };

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/config')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');
      });

      it('should validate priority values', async () => {
        const invalidData = {
          action_mappings: {
            analytics: {
              create: { 
                actionType: 'log',
                priority: 150, // Invalid priority > 100
                enabled: true 
              },
            },
          },
        };

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/config')
          .set('Authorization', 'Bearer admin-token')
          .send(invalidData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated');
      });
    });

    describe('GET /api/v1/admin/mobile-hooks/actions - Get Available Actions', () => {
      it('should return list of available action types', async () => {
        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/actions')
          .set('Authorization', 'Bearer admin-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_types');
        expect(response.body.data).toHaveProperty('action_descriptions');
        expect(response.body.data).toHaveProperty('default_settings');
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/actions/:action_type - Update Action Settings', () => {
      it('should successfully update settings for specific action type', async () => {
        const updateData = {
          enabled: true,
          recipients: ['test@example.com'],
          rate_limit_minutes: 10,
          template: 'test_template',
          priority: 'high',
        };

        const mockSetting = {
          key: `mobile.hooks.actions.settings.${ACTION_TYPES.EMAIL}`,
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put(`/api/v1/admin/mobile-hooks/actions/${ACTION_TYPES.EMAIL}`)
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid action type');
      });

      it('should validate action type exists', async () => {
        const updateData = {
          default_priority: 5,
          enabled: true,
        };

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/actions/invalid_action')
          .set('Authorization', 'Bearer admin-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid action type');
      });
    });
  });

  describe('User-Specific Mobile Configuration Endpoints', () => {

    describe('GET /api/v1/users/:id/mobile-config - Get User Mobile Config', () => {
      it('should return user-specific mobile configuration', async () => {
        const mockSettings = [
          {
            key: 'mobile.hooks.user.specific_user_789.analytics.enabled',
            value: 'false',
            userId: 'specific_user_789',
          },
          {
            key: 'mobile.hooks.user.specific_user_789.errorReporting.enabled',
            value: 'true',
            userId: 'specific_user_789',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });

      it('should fallback to global settings for missing user settings', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });

      it('should require user authorization for their own config', async () => {
        const response = await request(app)
          .get('/api/v1/users/different_user_999/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });
    });

    describe('PUT /api/v1/users/:id/mobile-config - Update User Mobile Config', () => {
      it('should successfully update user-specific mobile configuration', async () => {
        const updateData = {
          analytics_enabled: false,
          error_reporting_enabled: true,
          notification_preferences: {
            sync_conflicts: false,
            critical_errors: true,
          },
        };

        const mockSetting = {
          key: 'mobile.hooks.user.specific_user_789.analytics.enabled',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });

      it('should validate user-specific configuration limits', async () => {
        const invalidData = {
          max_offline_events: 15000, // Exceeds global limit
        };

        const response = await request(app)
          .put('/api/v1/users/specific_user_789/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });

      it('should require user authorization for updating their own config', async () => {
        const updateData = {
          analytics_enabled: false,
        };

        const response = await request(app)
          .put('/api/v1/users/different_user_999/mobile-config')
          .set('Authorization', 'Bearer user-token')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User ID is required');
      });
    });
  });

  describe('Configuration Integration and Consistency', () => {
    it('should maintain consistency between global and user-specific settings', async () => {
      // First, set global configuration
      const globalConfig = {
        analytics_enabled: true,
        max_offline_events: 1000,
      };

      const mockGlobalSetting = {
        key: 'mobile.hooks.analytics.enabled',
        value: 'true',
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockGlobalSetting]);

      await request(app)
        .put('/api/v1/config/mobile')
        .send(globalConfig)
        .expect(200);

      // Then, verify user settings respect global limits
      const userConfig = {
        max_offline_events: 1500, // Exceeds global setting
      };

      const response = await request(app)
        .put('/api/v1/users/specific_user_789/mobile-config')
        .set('Authorization', 'Bearer user-token')
        .send(userConfig)
        .expect(400);

      expect(response.body.error).toContain('User ID is required');
    });

    it('should handle configuration changes that affect multiple users', async () => {
      // Simulate global configuration change that affects all users
      const globalUpdate = {
        analytics_enabled: false, // Disabling analytics globally
        max_offline_events: 500, // Reducing global limit
      };

      const mockSetting = {
        key: 'mobile.hooks.analytics.enabled',
        value: 'true',
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

      const response = await request(app)
        .put('/api/v1/config/mobile')
        .send(globalUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify that user-specific settings are now constrained by new global limits
      const userUpdate = {
        max_offline_events: 800, // Now exceeds reduced global limit
      };

      const userResponse = await request(app)
        .put('/api/v1/users/specific_user_789/mobile-config')
        .set('Authorization', 'Bearer user-token')
        .send(userUpdate)
        .expect(400);

      expect(userResponse.body.error).toContain('User ID is required');
    });
  });

  describe('Configuration Performance and Caching', () => {
    it('should handle concurrent configuration updates gracefully', async () => {
      const updateData = {
        analytics_enabled: false,
      };

      const mockSetting = {
        key: 'mobile.hooks.analytics.enabled',
        value: 'true',
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

      // Simulate concurrent updates
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .put('/api/v1/config/mobile')
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