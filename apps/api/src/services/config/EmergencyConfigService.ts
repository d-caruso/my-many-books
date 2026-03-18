import {
  AUDIT_ACTIONS,
  EMERGENCY,
  EMERGENCY_ACTIONS,
  EMERGENCY_SETTING_KEYS,
  RESOURCE_TYPES,
} from '@my-many-books/shared-types';
import type { UniversalRequest } from '../../types';
import { getAuditLogService } from '../AuditLogService';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import { loadAppSettingValueMapByPrefix, upsertAppSetting } from './appSettingStore';

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

export interface EmergencyConfigUpdateRequest {
  mobileHooksEnabled?: boolean;
  apiHooksEnabled?: boolean;
  globalKillSwitch?: boolean;
  emergencyContacts?: string[];
  emergencyReason?: string | null;
}

class EmergencyConfigService {
  async getConfig(): Promise<EmergencyConfigResponse> {
    const settings = await loadAppSettingValueMapByPrefix('emergency.');
    const contacts = settings.get(EMERGENCY_SETTING_KEYS.CONTACTS);

    return {
      mobileHooksEnabled: settings.get(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED) !== 'false',
      apiHooksEnabled: settings.get(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED) !== 'false',
      globalKillSwitch: settings.get(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH) === 'true',
      emergencyContacts: this.parseContacts(contacts),
      lastEmergencyAction: settings.get(EMERGENCY_SETTING_KEYS.LAST_ACTION) ?? null,
      emergencyReason: settings.get(EMERGENCY_SETTING_KEYS.REASON) ?? null,
      emergencyActivatedBy: settings.get(EMERGENCY_SETTING_KEYS.ACTIVATED_BY) ?? null,
      emergencyActivatedAt: settings.get(EMERGENCY_SETTING_KEYS.ACTIVATED_AT) ?? null,
    };
  }

  async updateConfig(
    changes: EmergencyConfigUpdateRequest,
    request: UniversalRequest
  ): Promise<{ config: EmergencyConfigResponse; updated: string[]; lastUpdated: string }> {
    const previousConfig = await this.getConfig();
    const updatedSettings: string[] = [];
    const actor = controlPlaneHookService.getActorContext(request.user);

    try {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.EMERGENCY.TOGGLE, 'BEFORE', {
        actor,
        previousConfig,
        changes,
      });

      if (typeof changes.mobileHooksEnabled === 'boolean') {
        await this.saveSetting(
          EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED,
          String(changes.mobileHooksEnabled)
        );
        updatedSettings.push(EMERGENCY_SETTING_KEYS.MOBILE_HOOKS_ENABLED);
      }

      if (typeof changes.apiHooksEnabled === 'boolean') {
        await this.saveSetting(
          EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED,
          String(changes.apiHooksEnabled)
        );
        updatedSettings.push(EMERGENCY_SETTING_KEYS.API_HOOKS_ENABLED);
      }

      if (typeof changes.globalKillSwitch === 'boolean') {
        await this.saveSetting(
          EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          String(changes.globalKillSwitch)
        );
        updatedSettings.push(EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH);

        const activatedAt = new Date().toISOString();
        const activatedBy = String(request.user?.id ?? 'system');
        const lastAction = changes.globalKillSwitch
          ? EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_ACTIVATED
          : EMERGENCY_ACTIONS.GLOBAL_KILL_SWITCH_DEACTIVATED;

        await this.saveSetting(EMERGENCY_SETTING_KEYS.LAST_ACTION, lastAction);
        await this.saveSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_BY, activatedBy);
        await this.saveSetting(EMERGENCY_SETTING_KEYS.ACTIVATED_AT, activatedAt);

        if (changes.globalKillSwitch && changes.emergencyReason) {
          await this.saveSetting(EMERGENCY_SETTING_KEYS.REASON, changes.emergencyReason);
        }
      }

      if (changes.emergencyContacts !== undefined) {
        await this.saveSetting(
          EMERGENCY_SETTING_KEYS.CONTACTS,
          JSON.stringify(changes.emergencyContacts)
        );
        updatedSettings.push(EMERGENCY_SETTING_KEYS.CONTACTS);
      }

      if (changes.globalKillSwitch !== undefined) {
        getAuditLogService().logActionFromRequest(
          request,
          changes.globalKillSwitch
            ? AUDIT_ACTIONS.EMERGENCY_ACTIVATE
            : AUDIT_ACTIONS.EMERGENCY_DEACTIVATE,
          RESOURCE_TYPES.EMERGENCY_CONFIG,
          EMERGENCY_SETTING_KEYS.GLOBAL_KILL_SWITCH,
          {
            oldConfig: previousConfig,
            newConfig: changes,
            reason: changes.emergencyReason || 'No reason provided',
            changes: updatedSettings,
          }
        );
      }

      const config = await this.getConfig();

      void controlPlaneHookService.emitLifecycleEvent(EVENTS.EMERGENCY.TOGGLE, 'AFTER', {
        actor,
        previousConfig,
        config,
        updated: updatedSettings,
      });

      return {
        config,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      void controlPlaneHookService.emitLifecycleEvent(EVENTS.EMERGENCY.TOGGLE, 'FAILURE', {
        actor,
        changes,
        error,
      });
      throw error;
    }
  }

  private parseContacts(rawValue: string | undefined): string[] {
    if (!rawValue) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(rawValue);
      return Array.isArray(parsed) && parsed.every(item => typeof item === 'string') ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveSetting(key: string, value: string): Promise<void> {
    await upsertAppSetting({
      key,
      value,
      category: EMERGENCY,
      type: 'string',
      description: `Emergency configuration: ${key}`,
    });
  }
}

export const emergencyConfigService = new EmergencyConfigService();
