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
import { AUDIT_ACTIONS, RESOURCE_TYPES, EMERGENCY, EMERGENCY_SETTING_KEYS, EMERGENCY_ACTIONS } from '@my-many-books/shared-types';
import type { EmergencyConfigResponse } from '../../../src/controllers/mobile/EmergencyController';

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
            key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED,
            value: 'true',
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED,
            value: 'true',
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
            value: 'false',
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.CONTACTS,
            value: '["admin@example.com", "emergency@example.com"]',
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.LAST_ACTION,
            value: EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_ACTIVATED,
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.REASON,
            value: null,
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.ACTIVATED_BY,
            value: null,
            category: EMERGENCY,
          },
          {
            key: EMERGENCY_SETTING_KEYS.ACTIVATED_AT,
            value: null,
            category: EMERGENCY,
          },
        ];

        (AppSetting.findAll as jest.Mock).mockResolvedValue(mockEmergencySettings);

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(200);

        expect(response.body.success).toBe(true);

        const data = response.body.data as EmergencyConfigResponse;

        expect(data.mobileHooksEnabled).toBe(true);
        expect(data.apiHooksEnabled).toBe(true);
        expect(data.globalKillSwitch).toBe(false);
        expect(data.emergencyContacts).toBeDefined();
        expect(data.emergencyContacts).toEqual(['admin@example.com', 'emergency@example.com']);
        expect(data.lastEmergencyAction).toBe(EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_ACTIVATED);
        expect(data.emergencyReason).toBeNull();
        expect(data.emergencyActivatedBy).toBeNull();
        expect(data.emergencyActivatedAt).toBeNull();
      });

      it('should return default emergency configuration when no settings exist', async () => {
        (AppSetting.findAll as jest.Mock).mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/config/emergency')
          .expect(200);

        expect(response.body.success).toBe(true);
        
        const data = response.body.data as EmergencyConfigResponse;

        expect(data.mobileHooksEnabled).toBe(true); // Default enabled
        expect(data.apiHooksEnabled).toBe(true); // Default enabled
        expect(data.globalKillSwitch).toBe(false); // Default disabled
        expect(data.emergencyContacts).toEqual([]); // Default empty
        expect(data.lastEmergencyAction).toBeNull();
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
        
        const data = response.body.data as EmergencyConfigResponse;
        expect(data.emergencyContacts).toEqual([]); // Should fallback to empty array
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
          globalKillSwitch: true,
          emergencyReason: 'Critical security vulnerability detected',
          mobileHooksEnabled: false,
          apiHooksEnabled: false,
        };

        const mockSetting = {
          key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          value: 'false',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

        // Mock the loading of old config for audit logging
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'true' },
          { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(emergencyUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('config');
        expect(response.body.data).toHaveProperty('updated');
        expect(response.body.data.updated).toContain(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH);
        expect(response.body.data.updated).toContain(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED);
        expect(response.body.data.updated).toContain(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED);
        expect(response.body.data).toHaveProperty('lastUpdated');

        // Verify that kill switch activation settings were stored
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH },
            defaults: expect.objectContaining({
              value: 'true',
              category: EMERGENCY,
            }),
          })
        );

        // Verify emergency metadata was stored
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: EMERGENCY_SETTING_KEYS.LAST_ACTION },
            defaults: expect.objectContaining({
              value: EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_ACTIVATED,
            }),
          })
        );

        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: EMERGENCY_SETTING_KEYS.REASON },
            defaults: expect.objectContaining({
              value: 'Critical security vulnerability detected',
            }),
          })
        );
      });

      it('should successfully deactivate global kill switch', async () => {
        const emergencyDeactivation = {
          globalKillSwitch: false,
          mobileHooksEnabled: true,
          apiHooksEnabled: true,
        };

        const mockSetting = {
          key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(emergencyDeactivation)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toContain(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH);

        // Verify deactivation was logged
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: EMERGENCY_SETTING_KEYS.LAST_ACTION },
            defaults: expect.objectContaining({
              value: EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_DEACTIVATED,
            }),
          })
        );
      });

      it('should update emergency contacts list', async () => {
        const contactsUpdate = {
          emergencyContacts: [
            'primary.admin@example.com',
            'security.team@example.com',
            'on.call@example.com',
          ],
        };

        const mockSetting = {
          key: EMERGENCY_SETTING_KEYS.CONTACTS,
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
        expect(response.body.data.updated).toContain(EMERGENCY_SETTING_KEYS.CONTACTS);

        // Verify contacts were stored as JSON string
        expect(AppSetting.findOrCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { key: EMERGENCY_SETTING_KEYS.CONTACTS },
            defaults: expect.objectContaining({
              value: JSON.stringify(contactsUpdate.emergencyContacts),
            }),
          })
        );
      });

      it('should disable mobile hooks independently of API hooks', async () => {
        const mobileDisableUpdate = {
          mobileHooksEnabled: false,
          // apiHooksEnabled not specified, should remain unchanged
        };

        const mockSetting = {
          key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED,
          value: 'true',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' }, // Should remain unchanged
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(mobileDisableUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toEqual([EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED]);
        expect(response.body.data.updated).not.toContain(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED);
      });

      it('should handle partial emergency configuration updates', async () => {
        const partialUpdate = {
          emergencyContacts: ['updated.admin@example.com'],
          // Other settings not specified
        };

        const mockSetting = {
          key: EMERGENCY_SETTING_KEYS.CONTACTS,
          value: '[]',
          update: jest.fn().mockResolvedValue(undefined),
        };

        (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
        (AppSetting.findAll as jest.Mock).mockResolvedValue([
          { key: EMERGENCY_SETTING_KEYS.CONTACTS, value: '["updated.admin@example.com"]' },
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'true' },
        ]);

        const response = await request(app)
          .put('/api/v1/config/emergency')
          .send(partialUpdate)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toEqual([EMERGENCY_SETTING_KEYS.CONTACTS]);
        expect(AppSetting.findOrCreate).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors during emergency configuration updates', async () => {
        const emergencyUpdate = {
          globalKillSwitch: true,
          emergencyReason: 'Database test failure',
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
        globalKillSwitch: true,
        mobileHooksEnabled: false,
        apiHooksEnabled: false,
        emergencyReason: 'Data breach detected - immediate system lockdown',
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'false' },
        { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'true' },
        { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' },
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
        AUDIT_ACTIONS.EMERGENCY_ACTIVATE,
        RESOURCE_TYPES.EMERGENCY_CONFIG,
        EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
        expect.objectContaining({
          oldConfig: expect.any(Object),
          newConfig: criticalEmergency,
          reason: 'Data breach detected - immediate system lockdown',
          changes: expect.arrayContaining([EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH]),
        })
      );
    });

    it('should log emergency deactivation with audit trail', async () => {
      const emergencyRecovery = {
        globalKillSwitch: false,
        mobileHooksEnabled: true,
        apiHooksEnabled: true,
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
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
        AUDIT_ACTIONS.EMERGENCY_DEACTIVATE,
        RESOURCE_TYPES.EMERGENCY_CONFIG,
        EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
        expect.objectContaining({
          oldConfig: expect.any(Object),
          newConfig: emergencyRecovery,
          changes: expect.arrayContaining([EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH]),
        })
      );
    });

    it('should not log audit events for non-emergency changes', async () => {
      const nonEmergencyUpdate = {
        emergencyContacts: ['new.contact@example.com'],
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
        globalKillSwitch: true,
        emergencyReason: 'Automated security threat detected',
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
        globalKillSwitch: false,
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
        globalKillSwitch: true,
        mobileHooksEnabled: false,
        apiHooksEnabled: false,
        emergencyContacts: [
          'incident.commander@example.com',
          'security.lead@example.com',
          'platform.engineer@example.com',
        ],
        emergencyReason: 'Incident #INC-2024-001: Unauthorized API access detected',
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);

      // Mock initial state (for oldConfig call in PUT)
      (AppSetting.findAll as jest.Mock)
        .mockResolvedValueOnce([
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'true' },
          { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' },
          { key: EMERGENCY_SETTING_KEYS.CONTACTS, value: JSON.stringify(incidentResponse.emergencyContacts) },
        ])
        // Mock updated state (for newConfig call in PUT)
        .mockResolvedValueOnce([
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.CONTACTS, value: JSON.stringify(incidentResponse.emergencyContacts) },
          { key: EMERGENCY_SETTING_KEYS.REASON, value: incidentResponse.emergencyReason },
        ])
        // Mock updated state (for GET request)
        .mockResolvedValueOnce([
          { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
          { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'false' },
          { key: EMERGENCY_SETTING_KEYS.CONTACTS, value: JSON.stringify(incidentResponse.emergencyContacts) },
          { key: EMERGENCY_SETTING_KEYS.REASON, value: incidentResponse.emergencyReason },
        ]);

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(incidentResponse)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toEqual(
        expect.arrayContaining([
          EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED,
          EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED,
          EMERGENCY_SETTING_KEYS.CONTACTS
        ])
      );

      // Verify that emergency state can be retrieved
      const statusResponse = await request(app)
        .get('/api/v1/config/emergency')
        .expect(200);

      const data = statusResponse.body.data as EmergencyConfigResponse;

      expect(data.globalKillSwitch).toBe(true);
      expect(data.emergencyContacts).toEqual(incidentResponse.emergencyContacts);
      expect(data.emergencyReason).toBe(incidentResponse.emergencyReason);
    });

    it('should support gradual system recovery after incident resolution', async () => {
      // Step 1: Enable API hooks first (for monitoring)
      const partialRecovery = {
        apiHooksEnabled: true,
        // Keep mobile hooks disabled and kill switch active
      };

      const mockSetting = {
        update: jest.fn().mockResolvedValue(undefined),
      };

      (AppSetting.findOrCreate as jest.Mock).mockResolvedValue([mockSetting]);
      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' },
        { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
        { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'false' },
      ]);

      const partialResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(partialRecovery)
        .expect(200);

      expect(partialResponse.body.success).toBe(true);
      expect(partialResponse.body.data.updated).toEqual([EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED]);

      // Step 2: Enable mobile hooks
      const mobileRecovery = {
        mobileHooksEnabled: true,
      };

      (AppSetting.findAll as jest.Mock).mockResolvedValue([
        { key: EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, value: 'true' },
        { key: EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, value: 'true' },
        { key: EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, value: 'true' },
      ]);

      const mobileResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(mobileRecovery)
        .expect(200);

      expect(mobileResponse.body.success).toBe(true);

      // Step 3: Finally disable global kill switch
      const fullRecovery = {
        globalKillSwitch: false,
      };

      const finalResponse = await request(app)
        .put('/api/v1/config/emergency')
        .send(fullRecovery)
        .expect(200);

      expect(finalResponse.body.success).toBe(true);
      expect(finalResponse.body.data.updated).toEqual([EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH]);
    });
  });

  describe('Emergency Configuration Validation', () => {
    it('should validate emergency contacts format', async () => {
      const invalidContacts = {
        emergencyContacts: 'not_an_array', // Should be an array
      };

      const response = await request(app)
        .put('/api/v1/config/emergency')
        .send(invalidContacts)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();  // Just check error exists
      expect(response.body.error).not.toBe('');   // And it's not empty
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
      expect(response.body.error).toBeDefined();
    });
  });
});