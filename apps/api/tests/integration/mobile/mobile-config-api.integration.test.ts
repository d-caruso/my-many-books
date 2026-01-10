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

// Mock auth middleware to simulate different user types
const createAuthMock = (userRole: string, userId = 'test_user_123') => {
  return (req: any, _res: any, next: any) => {
    req.user = {
      id: userId,
      email: `${userRole}@example.com`,
      role: userRole,
      provider: 'test',
    };
    next();
  };
};

// Mock authorization middleware to allow different access levels
jest.mock('../../../src/middleware/authorization', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => {
    next();
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
    beforeEach(() => {
      // Mock auth for mobile user
      jest.doMock('../../../src/middleware/auth', () => ({
        authMiddleware: createAuthMock('user', 'mobile_user_123'),
      }));
    });

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
        expect(response.body.data).toHaveProperty('offline_storage_enabled', true);
        expect(response.body.data).toHaveProperty('performance_monitoring_enabled', false);
        expect(response.body.data).toHaveProperty('batch_upload_interval', 300);
        expect(response.body.data).toHaveProperty('max_offline_events', 1000);
        expect(response.body.data).toHaveProperty('estimated_memory_usage');
        expect(response.body.data).toHaveProperty('configuration_health_score');
        expect(response.body.data).toHaveProperty('feature_summary');
      });

      it('should calculate memory usage and health score correctly', async () => {
        const mockSettings = [
          { key: 'mobile.hooks.analytics.enabled', value: 'true' },
          { key: 'mobile.hooks.errorReporting.enabled', value: 'true' },
          { key: 'mobile.hooks.offlineStorage.enabled', value: 'true' },
          { key: 'mobile.hooks.performanceMonitoring.enabled', value: 'true' },
          { key: 'mobile.hooks.maxOfflineEvents', value: '2000' },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettings);

        const response = await request(app)
          .get('/api/v1/config/mobile')
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify memory calculation includes all enabled features
        expect(response.body.data.estimated_memory_usage).toBeGreaterThan(0);
        
        // Verify health score calculation
        expect(response.body.data.configuration_health_score).toBeGreaterThanOrEqual(0);
        expect(response.body.data.configuration_health_score).toBeLessThanOrEqual(100);
        
        // Verify feature summary
        expect(response.body.data.feature_summary).toHaveProperty('enabled_features');
        expect(response.body.data.feature_summary).toHaveProperty('disabled_features');
        expect(response.body.data.feature_summary.enabled_features).toHaveLength(4);
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
          offline_storage_enabled: true,
          performance_monitoring_enabled: true,
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
        expect(response.body.error).toContain('Failed to update mobile configuration');
      });
    });
  });

  describe('Admin Hook Action Configuration Endpoints', () => {
    beforeEach(() => {
      // Mock auth for admin user
      jest.doMock('../../../src/middleware/auth', () => ({
        authMiddleware: createAuthMock('admin', 'admin_user_456'),
      }));
    });

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
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_mappings');
        expect(response.body.data.action_mappings).toHaveProperty('analytics');
        expect(response.body.data.action_mappings).toHaveProperty('sync');
        expect(response.body.data).toHaveProperty('total_mappings', 3);
      });

      it('should handle empty hook action configuration', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/config')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.action_mappings).toEqual({});
        expect(response.body.data.total_mappings).toBe(0);
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
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('updated_mappings');
        expect(response.body.data.updated_mappings).toBeGreaterThan(0);
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
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid action mapping structure');
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
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Priority must be between 1 and 100');
      });
    });

    describe('GET /api/v1/admin/mobile-hooks/actions - Get Available Actions', () => {
      it('should return list of available action types', async () => {
        const response = await request(app)
          .get('/api/v1/admin/mobile-hooks/actions')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('available_actions');
        expect(response.body.data.available_actions).toContain('log');
        expect(response.body.data.available_actions).toContain('alert');
        expect(response.body.data.available_actions).toContain('notification');
        expect(response.body.data.available_actions).toContain('webhook');
      });
    });

    describe('PUT /api/v1/admin/mobile-hooks/actions/:action_type - Update Action Settings', () => {
      it('should successfully update settings for specific action type', async () => {
        const updateData = {
          default_priority: 5,
          enabled: true,
          configuration: {
            level: 'info',
            format: 'json',
          },
        };

        const mockSetting = {
          key: 'mobile.hooks.action_settings.log',
          value: '{}',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/actions/log')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('action_type', 'log');
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data.settings).toHaveProperty('default_priority', 5);
        expect(response.body.data.settings).toHaveProperty('enabled', true);
      });

      it('should validate action type exists', async () => {
        const updateData = {
          default_priority: 5,
          enabled: true,
        };

        const response = await request(app)
          .put('/api/v1/admin/mobile-hooks/actions/invalid_action')
          .send(updateData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid action type');
      });
    });
  });

  describe('User-Specific Mobile Configuration Endpoints', () => {
    beforeEach(() => {
      // Mock auth for regular user
      jest.doMock('../../../src/middleware/auth', () => ({
        authMiddleware: createAuthMock('user', 'specific_user_789'),
      }));
    });

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
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user_id', 'specific_user_789');
        expect(response.body.data).toHaveProperty('settings');
        expect(response.body.data.settings).toHaveProperty('analytics_enabled', false);
        expect(response.body.data.settings).toHaveProperty('error_reporting_enabled', true);
      });

      it('should fallback to global settings for missing user settings', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/users/specific_user_789/mobile-config')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.settings).toHaveProperty('analytics_enabled', true); // Global default
        expect(response.body.data.inheritance_info.inherited_from_global).toContain('analytics_enabled');
      });

      it('should require user authorization for their own config', async () => {
        const response = await request(app)
          .get('/api/v1/users/different_user_999/mobile-config')
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Access denied');
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
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user_id', 'specific_user_789');
        expect(response.body.data).toHaveProperty('updated_settings');
        expect(response.body.data.updated_settings).toContain('analytics_enabled');
        expect(response.body.data.updated_settings).toContain('error_reporting_enabled');
      });

      it('should validate user-specific configuration limits', async () => {
        const invalidData = {
          max_offline_events: 15000, // Exceeds global limit
        };

        const response = await request(app)
          .put('/api/v1/users/specific_user_789/mobile-config')
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('User setting cannot exceed global limit');
      });

      it('should require user authorization for updating their own config', async () => {
        const updateData = {
          analytics_enabled: false,
        };

        const response = await request(app)
          .put('/api/v1/users/different_user_999/mobile-config')
          .send(updateData)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Access denied');
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
        .send(userConfig)
        .expect(400);

      expect(response.body.error).toContain('User setting cannot exceed global limit');
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
        .send(userUpdate)
        .expect(400);

      expect(userResponse.body.error).toContain('User setting cannot exceed global limit');
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

    it('should provide configuration metadata for caching decisions', async () => {
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: 'mobile.hooks.analytics.enabled', value: 'true' },
      ]);

      const response = await request(app)
        .get('/api/v1/config/mobile')
        .expect(200);

      expect(response.body.data).toHaveProperty('cache_info');
      expect(response.body.data.cache_info).toHaveProperty('last_modified');
      expect(response.body.data.cache_info).toHaveProperty('version');
      expect(response.body.data.cache_info).toHaveProperty('etag');
    });
  });
});