// ================================================================
// src/controllers/EmergencyController.ts
// Emergency kill switch configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingCreationAttributes } from '../../models';
import { Op } from 'sequelize';
import { getAuditLogService } from '../../services/AuditLogService';
import { AUDIT_ACTIONS, RESOURCE_TYPES, EMERGENCY_SETTING_KEYS, EMERGENCY_ACTIONS, EMERGENCY } from '@my-many-books/shared-types';

export interface EmergencyConfigResponse {
    mobileHooksEnabled: boolean;
    apiHooksEnabled: boolean;
    globalKillSwitch: boolean;
    emergencyContacts: string[];
    lastEmergencyAction: string | null;
    emergencyReason: string | null;
    emergencyActivatedBy: string | null;
    emergencyActivatedAt: string | null;
  }

interface EmergencyConfigUpdateRequest {
    mobileHooksEnabled?: boolean;
    apiHooksEnabled?: boolean;
    globalKillSwitch?: boolean;
    emergencyContacts?: string[];
    emergencyReason?: string | null;
  }

export class EmergencyController extends BaseController {
  private isEmergencyConfigUpdateRequest(value: unknown): value is EmergencyConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (
      value['mobileHooksEnabled'] !== undefined &&
      typeof value['mobileHooksEnabled'] !== 'boolean'
    ) {
      return false;
    }

    if (value['apiHooksEnabled'] !== undefined && typeof value['apiHooksEnabled'] !== 'boolean') {
      return false;
    }

    if (
      value['globalKillSwitch'] !== undefined &&
      typeof value['globalKillSwitch'] !== 'boolean'
    ) {
      return false;
    }

    if (value['emergencyReason'] !== undefined) {
      if (
        value['emergencyReason'] !== null &&
        typeof value['emergencyReason'] !== 'string'
      ) {
        return false;
      }
    }

    if (value['emergencyContacts'] !== undefined) {
      if (
        !Array.isArray(value['emergencyContacts']) ||
        !value['emergencyContacts'].every(contact => typeof contact === 'string')
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * GET /api/<version>/config/emergency - Get emergency kill switches
   */
  async getEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const config = await this.loadEmergencyConfig();
      return this.createSuccessResponse(config);
    } catch {
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
    }
  }

  /**
   * PUT /api/<version>/config/emergency - Update emergency settings
   */
  async updateEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody(request);
    if (!this.isEmergencyConfigUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const oldConfig = await this.loadEmergencyConfig();
      const updatedSettings: string[] = [];

      // Update emergency settings
      if (typeof body.mobileHooksEnabled === 'boolean') {
        await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED, String(body.mobileHooksEnabled));
        updatedSettings.push(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED);
      }

      if (typeof body.apiHooksEnabled === 'boolean') {
        await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED, String(body.apiHooksEnabled));
        updatedSettings.push(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED);
      }

      if (typeof body.globalKillSwitch === 'boolean') {
        await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH, String(body.globalKillSwitch));
        updatedSettings.push(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH);
        
        // Track emergency activation
        if (body.globalKillSwitch) {
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.LAST_ACTION, EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_ACTIVATED);
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_BY, String(request.user?.id || 'system'));
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_AT, new Date().toISOString());
          if (body.emergencyReason) {
            await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.REASON, body.emergencyReason);
          }
        } else {
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.LAST_ACTION, EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_DEACTIVATED);
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_BY, String(request.user?.id || 'system'));
          await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_AT, new Date().toISOString());
        }
      }

      if (body.emergencyContacts !== undefined) {
        await this.updateConfigSetting(EMERGENCY_SETTING_KEYS.CONTACTS, JSON.stringify(body.emergencyContacts));
        updatedSettings.push(EMERGENCY_SETTING_KEYS.CONTACTS);
      }

      // Log critical emergency actions
      if (body.globalKillSwitch !== undefined) {
        getAuditLogService().logActionFromRequest(
          request,
          body.globalKillSwitch ? AUDIT_ACTIONS.EMERGENCY_ACTIVATE : AUDIT_ACTIONS.EMERGENCY_DEACTIVATE,
          RESOURCE_TYPES.EMERGENCY_CONFIG,
          EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          {
            oldConfig,
            newConfig: body,
            reason: body.emergencyReason || 'No reason provided',
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
    } catch {
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
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
    const contactsStr = settingsMap.get(EMERGENCY_SETTING_KEYS.CONTACTS);
    let emergencyContacts: string[] = [];
    if (contactsStr) {
      try {
        const parsed: unknown = JSON.parse(contactsStr);
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
      mobileHooksEnabled: this.parseBoolean(settingsMap.get(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED), true),
      apiHooksEnabled: this.parseBoolean(settingsMap.get(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED), true),
      globalKillSwitch: this.parseBoolean(settingsMap.get(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH), false),
      emergencyContacts: emergencyContacts,
      lastEmergencyAction: settingsMap.get(EMERGENCY_SETTING_KEYS.LAST_ACTION) || null,
      emergencyReason: settingsMap.get(EMERGENCY_SETTING_KEYS.REASON) || null,
      emergencyActivatedBy: settingsMap.get(EMERGENCY_SETTING_KEYS.ACTIVATED_BY) || null,
      emergencyActivatedAt: settingsMap.get(EMERGENCY_SETTING_KEYS.ACTIVATED_AT) || null,
    };
  }

  /**
   * Update a single configuration setting
   */
  private async updateConfigSetting(key: string, value: string): Promise<void> {
    const defaults: AppSettingCreationAttributes = {
      key,
      value,
      active: true,
      category: EMERGENCY,
      type: 'string',
      defaultValue: value,
      description: `Emergency configuration: ${key}`,
      deleted: false,
    };

    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }
}

export const emergencyController = new EmergencyController();
