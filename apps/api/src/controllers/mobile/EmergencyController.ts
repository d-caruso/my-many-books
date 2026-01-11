// ================================================================
// src/controllers/EmergencyController.ts
// Emergency kill switch configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingAttributes } from '../../models';
import { Op } from 'sequelize';
import { getAuditLogService } from '../../services/AuditLogService';

export interface EmergencyConfigResponse {
  mobile_hooks_enabled: boolean;
  api_hooks_enabled: boolean;
  global_kill_switch: boolean;
  emergency_contacts: string[];
  last_emergency_action: string | null;
  emergency_reason: string | null;
  emergency_activated_by: string | null;
  emergency_activated_at: string | null;
}

export interface EmergencyConfigUpdateRequest {
  mobile_hooks_enabled?: boolean;
  api_hooks_enabled?: boolean;
  global_kill_switch?: boolean;
  emergency_contacts?: string[];
  emergency_reason?: string;
}

export class EmergencyController extends BaseController {
  /**
   * GET /api/config/emergency - Get emergency kill switches
   */
  async getEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const config = await this.loadEmergencyConfig();
      return this.createSuccessResponse(config);
    } catch (error) {
      return this.createErrorResponse('Failed to fetch emergency configuration', 500);
    }
  }

  /**
   * PUT /api/config/emergency - Update emergency settings
   */
  async updateEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody<EmergencyConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const oldConfig = await this.loadEmergencyConfig();
      const updatedSettings: string[] = [];

      // Update emergency settings
      if (typeof body.mobile_hooks_enabled === 'boolean') {
        await this.updateConfigSetting('emergency.mobile_hooks.enabled', String(body.mobile_hooks_enabled));
        updatedSettings.push('mobile_hooks_enabled');
      }

      if (typeof body.api_hooks_enabled === 'boolean') {
        await this.updateConfigSetting('emergency.api_hooks.enabled', String(body.api_hooks_enabled));
        updatedSettings.push('api_hooks_enabled');
      }

      if (typeof body.global_kill_switch === 'boolean') {
        await this.updateConfigSetting('emergency.global_kill_switch', String(body.global_kill_switch));
        updatedSettings.push('global_kill_switch');
        
        // Track emergency activation
        if (body.global_kill_switch) {
          await this.updateConfigSetting('emergency.last_action', 'GLOBAL_KILL_SWITCH_ACTIVATED');
          await this.updateConfigSetting('emergency.activated_by', String(request.user?.id || 'system'));
          await this.updateConfigSetting('emergency.activated_at', new Date().toISOString());
          if (body.emergency_reason) {
            await this.updateConfigSetting('emergency.reason', body.emergency_reason);
          }
        } else {
          await this.updateConfigSetting('emergency.last_action', 'GLOBAL_KILL_SWITCH_DEACTIVATED');
          await this.updateConfigSetting('emergency.activated_by', String(request.user?.id || 'system'));
          await this.updateConfigSetting('emergency.activated_at', new Date().toISOString());
        }
      }

      if (body.emergency_contacts !== undefined) {
        if (!Array.isArray(body.emergency_contacts)) {
          return this.createErrorResponse('emergency_contacts must be an array', 400);
        }
        await this.updateConfigSetting('emergency.contacts', JSON.stringify(body.emergency_contacts));
        updatedSettings.push('emergency_contacts');
      }

      // Log critical emergency actions
      if (body.global_kill_switch !== undefined) {
        getAuditLogService().logActionFromRequest(
          request,
          body.global_kill_switch ? 'EMERGENCY_ACTIVATE' : 'EMERGENCY_DEACTIVATE',
          'emergency_config',
          'global_kill_switch',
          {
            oldConfig,
            newConfig: body,
            reason: body.emergency_reason || 'No reason provided',
            changes: updatedSettings,
          }
        );
      }

      const newConfig = await this.loadEmergencyConfig();

      return this.createSuccessResponse({
        config: newConfig,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      }, 'Emergency configuration updated successfully');
    } catch (error) {
      return this.createErrorResponse('Failed to update emergency configuration', 500);
    }
  }

  /**
   * Load emergency configuration from database
   */
  private async loadEmergencyConfig(): Promise<EmergencyConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: 'emergency.%'
        },
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Parse emergency contacts
    const contactsStr = settingsMap.get('emergency.contacts');
    let emergencyContacts: string[] = [];
    if (contactsStr) {
      try {
        const parsed = JSON.parse(contactsStr) as unknown;
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          emergencyContacts = parsed;
        } else {
          emergencyContacts = [];
        }
      } catch {
        emergencyContacts = [];
      }
    }

    return {
      mobile_hooks_enabled: this.parseBoolean(settingsMap.get('emergency.mobile_hooks.enabled'), true),
      api_hooks_enabled: this.parseBoolean(settingsMap.get('emergency.api_hooks.enabled'), true),
      global_kill_switch: this.parseBoolean(settingsMap.get('emergency.global_kill_switch'), false),
      emergency_contacts: emergencyContacts,
      last_emergency_action: settingsMap.get('emergency.last_action') || null,
      emergency_reason: settingsMap.get('emergency.reason') || null,
      emergency_activated_by: settingsMap.get('emergency.activated_by') || null,
      emergency_activated_at: settingsMap.get('emergency.activated_at') || null,
    };
  }

  /**
   * Update a single configuration setting
   */
  private async updateConfigSetting(key: string, value: string): Promise<void> {
    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value,
        active: true,
        category: 'emergency',
        type: 'string',
        defaultValue: value,
        description: `Emergency configuration: ${key}`,
        deleted: false,
      } as AppSettingAttributes,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }

  /**
   * Parse boolean value from string
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true';
  }
}

export const emergencyController = new EmergencyController();