// ================================================================
// tests/integration/mobile/emergency-kill-switches.integration.test.ts
// Integration tests for emergency kill switches functionality
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

// Mock auth middleware to simulate admin user
jest.mock('../../../src/middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'admin_emergency_123',
      email: 'emergency.admin@example.com',
      role: 'admin',
      provider: 'emergency_system',
    };
    next();
  },
}));

// Mock authorization middleware for admin access
jest.mock('../../../src/middleware/authorization', () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => {
    next();
  },
}));

// Mock audit log service to track emergency actions
const mockAuditLogService = {
  logActionFromRequest: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/services/AuditLogService', () => ({
  getAuditLogService: jest.fn(() => mockAuditLogService),
}));

describe('Emergency Kill Switches Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Emergency Configuration Retrieval', () => {
    describe('GET /api/v1/config/emergency - Get Emergency Config', () => {
      it('should return current emergency configuration', async () => {
        const mockEmergencySettings = [
          {
            key: 'emergency.mobile_hooks.enabled',
            value: 'true',
            category: 'emergency',
          },
          {
            key: 'emergency.api_hooks.enabled',
            value: 'true',
            category: 'emergency',
          },
          {
            key: 'emergency.global_kill_switch',
            value: 'false',
            category: 'emergency',
          },
          {
            key: 'emergency.contacts',
            value: '["admin@example.com", "emergency@example.com"]',
            category: 'emergency',
          },
          {
            key: 'emergency.last_action',
            value: 'SYSTEM_INITIALIZED',
            category: 'emergency',
          },
          {
            key: 'emergency.reason',
            value: null,
            category: 'emergency',
          },
          {
            key: 'emergency.activated_by',
            value: null,
            category: 'emergency',
          },
          {
            key: 'emergency.activated_at',
            value: null,
            category: 'emergency',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockEmergencySettings);

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mobile_hooks_enabled', true);
        expect(response.body.data).toHaveProperty('api_hooks_enabled', true);
        expect(response.body.data).toHaveProperty('global_kill_switch', false);
        expect(response.body.data).toHaveProperty('emergency_contacts');
        expect(response.body.data.emergency_contacts).toEqual(['admin@example.com', 'emergency@example.com']);
        expect(response.body.data).toHaveProperty('last_emergency_action', 'SYSTEM_INITIALIZED');
        expect(response.body.data).toHaveProperty('emergency_reason', null);
        expect(response.body.data).toHaveProperty('emergency_activated_by', null);
        expect(response.body.data).toHaveProperty('emergency_activated_at', null);
      });

      it('should return default emergency configuration when no settings exist', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('mobile_hooks_enabled', true); // Default enabled
        expect(response.body.data).toHaveProperty('api_hooks_enabled', true); // Default enabled
        expect(response.body.data).toHaveProperty('global_kill_switch', false); // Default disabled
        expect(response.body.data).toHaveProperty('emergency_contacts', []); // Default empty
        expect(response.body.data).toHaveProperty('last_emergency_action', null);
      });

      it('should handle corrupted emergency contacts gracefully', async () => {
        const mockSettingsWithCorruptedContacts = [
          {
            key: 'emergency.contacts',
            value: 'invalid json string',
            category: 'emergency',
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockSettingsWithCorruptedContacts);

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.emergency_contacts).toEqual([]); // Should fallback to empty array
      });

      it('should handle database errors during emergency config retrieval', async () => {
        (AppSetting.findAll as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Failed to fetch emergency configuration');
      });
    });
  });

  describe('Emergency Configuration Updates', () => {
    describe('PUT /api/v1/config/emergency - Update Emergency Config', () => {
      it('should successfully activate global kill switch with reason', async () => {
        const emergencyUpdate = {
          global_kill_switch: true,
          emergency_reason: 'Critical security vulnerability detected',
          mobile_hooks_enabled: false,
          api_hooks_enabled: false,
        };

        const mockSetting = {
          key: 'emergency.global_kill_switch',
          value: 'false',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        // Mock the loading of old config for audit logging
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: 'emergency.global_kill_switch', value: 'false' },
          { key: 'emergency.mobile_hooks.enabled', value: 'true' },
          { key: 'emergency.api_hooks.enabled', value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(emergencyUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('config');
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data.updated).toContain('global_kill_switch');
        expect(response.body.data.updated).toContain('mobile_hooks_enabled');
        expect(response.body.data.updated).toContain('api_hooks_enabled');
        expect(response.body.data).toHaveProperty('lastUpdated');

        // Verify that kill switch activation settings were stored
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'emergency.global_kill_switch' },
            defaults: expect.objectContaining({
              value: 'true',
              category: 'emergency',
            }),
          })
        );

        // Verify emergency metadata was stored
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'emergency.last_action' },
            defaults: expect.objectContaining({
              value: 'GLOBAL_KILL_SWITCH_ACTIVATED',
            }),
          })
        );

        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'emergency.reason' },
            defaults: expect.objectContaining({
              value: 'Critical security vulnerability detected',
            }),
          })
        );
      });

      it('should successfully deactivate global kill switch', async () => {
        const emergencyDeactivation = {
          global_kill_switch: false,
          mobile_hooks_enabled: true,
          api_hooks_enabled: true,
        };

        const mockSetting = {
          key: 'emergency.global_kill_switch',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: 'emergency.global_kill_switch', value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(emergencyDeactivation)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toContain('global_kill_switch');

        // Verify deactivation was logged
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'emergency.last_action' },
            defaults: expect.objectContaining({
              value: 'GLOBAL_KILL_SWITCH_DEACTIVATED',
            }),
          })
        );
      });

      it('should update emergency contacts list', async () => {
        const contactsUpdate = {
          emergency_contacts: [
            'primary.admin@example.com',
            'security.team@example.com',
            'on.call@example.com',
          ],
        };

        const mockSetting = {
          key: 'emergency.contacts',
          value: '[]',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(contactsUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toContain('emergency_contacts');

        // Verify contacts were stored as JSON string
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: 'emergency.contacts' },
            defaults: expect.objectContaining({
              value: JSON.stringify(contactsUpdate.emergency_contacts),
            }),
          })
        );
      });

      it('should disable mobile hooks independently of API hooks', async () => {
        const mobileDisableUpdate = {
          mobile_hooks_enabled: false,
          // api_hooks_enabled not specified, should remain unchanged
        };

        const mockSetting = {
          key: 'emergency.mobile_hooks.enabled',
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: 'emergency.mobile_hooks.enabled', value: 'false' },
          { key: 'emergency.api_hooks.enabled', value: 'true' }, // Should remain unchanged
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(mobileDisableUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toEqual(['mobile_hooks_enabled']);
        expect(response.body.data.updated).not.toContain('api_hooks_enabled');
      });

      it('should handle partial emergency configuration updates', async () => {
        const partialUpdate = {
          emergency_contacts: ['updated.admin@example.com'],
          // Other settings not specified
        };

        const mockSetting = {
          key: 'emergency.contacts',
          value: '[]',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: 'emergency.contacts', value: '["updated.admin@example.com"]' },
          { key: 'emergency.global_kill_switch', value: 'false' },
          { key: 'emergency.mobile_hooks.enabled', value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toEqual(['emergency_contacts']);
        expect(AppSetting.findOrCreate).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors during emergency configuration updates', async () => {
        const emergencyUpdate = {
          global_kill_switch: true,
          emergency_reason: 'Database test failure',
        };

        (AppSetting.findOrCreate as jest.Mock).mockRejectedValue(
          new Error('Database connection lost during critical update')
        );

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(emergencyUpdate)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Failed to update emergency configuration');
      });
    });
  });

  describe('Emergency Audit Logging', () => {
    it('should log emergency activation with detailed context', async () => {
      const criticalEmergency = {
        global_kill_switch: true,
        mobile_hooks_enabled: false,
        api_hooks_enabled: false,
        emergency_reason: 'Data breach detected - immediate system lockdown',
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: 'emergency.global_kill_switch', value: 'false' },
        { key: 'emergency.mobile_hooks.enabled', value: 'true' },
        { key: 'emergency.api_hooks.enabled', value: 'true' },
      ]);

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(criticalEmergency)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify audit logging captured emergency activation
      expect(mockAuditLogService.logActionFromRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'admin_emergency_123',
            role: 'admin',
          }),
        }),
        'EMERGENCY_ACTIVATE',
        'emergency_config',
        'global_kill_switch',
        expect.objectContaining({
          oldConfig: expect.any(Object),
          newConfig: criticalEmergency,
          reason: 'Data breach detected - immediate system lockdown',
          changes: expect.arrayContaining(['global_kill_switch']),
        })
      );
    });

    it('should log emergency deactivation with audit trail', async () => {
      const emergencyRecovery = {
        global_kill_switch: false,
        mobile_hooks_enabled: true,
        api_hooks_enabled: true,
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: 'emergency.global_kill_switch', value: 'true' },
      ]);

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(emergencyRecovery)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify audit logging captured emergency deactivation
      expect(mockAuditLogService.logActionFromRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'admin_emergency_123',
            role: 'admin',
          }),
        }),
        'EMERGENCY_DEACTIVATE',
        'emergency_config',
        'global_kill_switch',
        expect.objectContaining({
          oldConfig: expect.any(Object),
          newConfig: emergencyRecovery,
          changes: expect.arrayContaining(['global_kill_switch']),
        })
      );
    });

    it('should not log audit events for non-emergency changes', async () => {
      const nonEmergencyUpdate = {
        emergency_contacts: ['new.contact@example.com'],
        // No kill switch changes
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const { getAuditLogService } = require('../../../src/services/AuditLogService');
      const mockAuditLog = getAuditLogService();

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(nonEmergencyUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify no emergency audit log was created
      expect(mockAuditLog.logActionFromRequest).not.toHaveBeenCalled();
    });
  });

  describe('Emergency State Tracking', () => {
    it('should track emergency activation metadata accurately', async () => {
      const emergencyActivation = {
        global_kill_switch: true,
        emergency_reason: 'Automated security threat detected',
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const beforeTime = new Date();
      
      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(emergencyActivation)
        .expect(200);

      const afterTime = new Date();

      expect(response.body.success).toBe(true);

      // Verify emergency metadata was stored
      const findOrCreateCalls = (AppSetting.findOrCreate as jest.Mock).mock.calls;
      
      // Find the call that stores the activation timestamp
      const activatedAtCall = findOrCreateCalls.find(call => 
        call[0].where.key === 'emergency.activated_at'
      );
      expect(activatedAtCall).toBeDefined();
      
      const storedTimestamp = new Date(activatedAtCall[0].defaults.value);
      expect(storedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(storedTimestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());

      // Verify activated_by was stored
      const activatedByCall = findOrCreateCalls.find(call => 
        call[0].where.key === 'emergency.activated_by'
      );
      expect(activatedByCall).toBeDefined();
      expect(activatedByCall[0].defaults.value).toBe('admin_emergency_123');

      // Verify reason was stored
      const reasonCall = findOrCreateCalls.find(call => 
        call[0].where.key === 'emergency.reason'
      );
      expect(reasonCall).toBeDefined();
      expect(reasonCall[0].defaults.value).toBe('Automated security threat detected');
    });

    it('should clear emergency metadata on deactivation', async () => {
      const emergencyDeactivation = {
        global_kill_switch: false,
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(emergencyDeactivation)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify deactivation was logged
      const findOrCreateCalls = (AppSetting.findOrCreate as jest.Mock).mock.calls;
      
      const lastActionCall = findOrCreateCalls.find(call => 
        call[0].where.key === 'emergency.last_action'
      );
      expect(lastActionCall[0].defaults.value).toBe('GLOBAL_KILL_SWITCH_DEACTIVATED');
    });
  });

  describe('Emergency Response Coordination', () => {
    it('should handle emergency configuration for incident response workflows', async () => {
      // Simulate a complete incident response workflow
      const incidentResponse = {
        global_kill_switch: true,
        mobile_hooks_enabled: false,
        api_hooks_enabled: false,
        emergency_contacts: [
          'incident.commander@example.com',
          'security.lead@example.com',
          'platform.engineer@example.com',
        ],
        emergency_reason: 'Incident #INC-2024-001: Unauthorized API access detected',
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      
      // Mock initial state (for oldConfig call in PUT)
      (AppSetting.findAll as jest.Mock)
        .mockResolvedValueOnce([
          { key: 'emergency.global_kill_switch', value: 'false' },
          { key: 'emergency.mobile_hooks.enabled', value: 'true' },
          { key: 'emergency.api_hooks.enabled', value: 'true' },
          { key: 'emergency.contacts', value: JSON.stringify(incidentResponse.emergency_contacts) },
        ])
        // Mock updated state (for newConfig call in PUT)
        .mockResolvedValueOnce([
          { key: 'emergency.global_kill_switch', value: 'true' },
          { key: 'emergency.mobile_hooks.enabled', value: 'false' },
          { key: 'emergency.api_hooks.enabled', value: 'false' },
          { key: 'emergency.contacts', value: JSON.stringify(incidentResponse.emergency_contacts) },
          { key: 'emergency.reason', value: incidentResponse.emergency_reason },
        ])
        // Mock updated state (for GET request)
        .mockResolvedValueOnce([
          { key: 'emergency.global_kill_switch', value: 'true' },
          { key: 'emergency.mobile_hooks.enabled', value: 'false' },
          { key: 'emergency.api_hooks.enabled', value: 'false' },
          { key: 'emergency.contacts', value: JSON.stringify(incidentResponse.emergency_contacts) },
          { key: 'emergency.reason', value: incidentResponse.emergency_reason },
        ]);

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(incidentResponse)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toEqual(
        expect.arrayContaining([
          'global_kill_switch',
          'mobile_hooks_enabled', 
          'api_hooks_enabled',
          'emergency_contacts'
        ])
      );

      // Verify that emergency state can be retrieved
      const statusResponse = await request(app)
        .get('/api/v1/config/emergency')
        .expect(200);

      expect(statusResponse.body.data.global_kill_switch).toBe(true);
      expect(statusResponse.body.data.emergency_contacts).toEqual(incidentResponse.emergency_contacts);
      expect(statusResponse.body.data.emergency_reason).toBe(incidentResponse.emergency_reason);
    });

    it('should support gradual system recovery after incident resolution', async () => {
      // Step 1: Enable API hooks first (for monitoring)
      const partialRecovery = {
        api_hooks_enabled: true,
        // Keep mobile hooks disabled and kill switch active
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: 'emergency.api_hooks.enabled', value: 'true' },
        { key: 'emergency.global_kill_switch', value: 'true' },
        { key: 'emergency.mobile_hooks.enabled', value: 'false' },
      ]);

      const partialResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(partialRecovery)
        .expect(200);

      expect(partialResponse.body.success).toBe(true);
      expect(partialResponse.body.data.updated).toEqual(['api_hooks_enabled']);

      // Step 2: Enable mobile hooks
      const mobileRecovery = {
        mobile_hooks_enabled: true,
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: 'emergency.api_hooks.enabled', value: 'true' },
        { key: 'emergency.global_kill_switch', value: 'true' },
        { key: 'emergency.mobile_hooks.enabled', value: 'true' },
      ]);

      const mobileResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(mobileRecovery)
        .expect(200);

      expect(mobileResponse.body.success).toBe(true);

      // Step 3: Finally disable global kill switch
      const fullRecovery = {
        global_kill_switch: false,
      };

      const finalResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(fullRecovery)
        .expect(200);

      expect(finalResponse.body.success).toBe(true);
      expect(finalResponse.body.data.updated).toEqual(['global_kill_switch']);
    });
  });

  describe('Emergency Configuration Validation', () => {
    it('should validate emergency contacts format', async () => {
      const invalidContacts = {
        emergency_contacts: 'not_an_array', // Should be an array
      };

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(invalidContacts)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('emergency_contacts must be an array');
    });

    it('should handle malformed configuration payloads', async () => {
      const response = await request(app)
        .put('/api/v1/config/emergency')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON payload');
    });

    it('should reject empty emergency configuration updates', async () => {
      const emptyUpdate = {};

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(emptyUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('errors:validation_failed');
    });
  });
});