import {
  MOBILE_APP_METADATA,
  MOBILE_APP_SETTING_KEYS,
  MOBILE_APP_SETTINGS_ACTIONS,
  type MobileAppSettings,
} from '@my-many-books/shared-types';
import type { UniversalRequest } from '../../types';
import { getAuditLogService } from '../AuditLogService';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import {
  getLatestAppSettingUpdateByKeys,
  loadAppSettingValueMapByKeys,
  upsertAppSetting,
} from './appSettingStore';

export const DEFAULT_MOBILE_APP_SETTINGS: MobileAppSettings = {
  offlineStorageEnabled: true,
  batchUploadInterval: 300,
  maxOfflineEvents: 1000,
};

export const MOBILE_APP_SETTINGS_SCHEMA = {
  properties: {
    offlineStorageEnabled: {
      type: 'boolean',
      description: 'Enable or disable offline storage',
      default: true,
    },
    batchUploadInterval: {
      type: 'number',
      description: 'Batch upload interval in seconds',
      minimum: 60,
      maximum: 3600,
      default: 300,
    },
    maxOfflineEvents: {
      type: 'number',
      description: 'Maximum number of offline events to store',
      minimum: 100,
      maximum: 10000,
      default: 1000,
    },
  },
  required: [],
  defaults: DEFAULT_MOBILE_APP_SETTINGS,
} as const;

export interface MobileAppSettingsResponse {
  settings: MobileAppSettings;
  lastUpdated: string | null;
  version: string;
}

class MobileAppSettingsService {
  async getSettings(): Promise<MobileAppSettingsResponse> {
    return {
      settings: await this.loadSettings(),
      lastUpdated: await getLatestAppSettingUpdateByKeys(Object.values(MOBILE_APP_SETTING_KEYS)),
      version: MOBILE_APP_METADATA.VERSION,
    };
  }

  async updateSettings(
    changes: Partial<MobileAppSettings>,
    request: UniversalRequest
  ): Promise<{ settings: MobileAppSettings; updated: string[]; lastUpdated: string }> {
    this.validateSettings(changes);

    const previousSettings = await this.loadSettings();
    const updatedSettings: Array<{ key: string; value: string }> = [];
    const actor = controlPlaneHookService.getActorContext(request.user);

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.UPDATE,
        'BEFORE',
        {
          actor,
          previousSettings,
          changes,
        }
      );

      if (typeof changes.offlineStorageEnabled === 'boolean') {
        await this.saveSetting(
          MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
          String(changes.offlineStorageEnabled)
        );
        updatedSettings.push({
          key: 'offlineStorageEnabled',
          value: String(changes.offlineStorageEnabled),
        });
      }

      if (typeof changes.batchUploadInterval === 'number') {
        await this.saveSetting(
          MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
          String(changes.batchUploadInterval)
        );
        updatedSettings.push({
          key: 'batchUploadInterval',
          value: String(changes.batchUploadInterval),
        });
      }

      if (typeof changes.maxOfflineEvents === 'number') {
        await this.saveSetting(
          MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS,
          String(changes.maxOfflineEvents)
        );
        updatedSettings.push({
          key: 'maxOfflineEvents',
          value: String(changes.maxOfflineEvents),
        });
      }

      getAuditLogService().logActionFromRequest(
        request,
        MOBILE_APP_SETTINGS_ACTIONS.UPDATE,
        MOBILE_APP_METADATA.RESOURCE_TYPE,
        MOBILE_APP_METADATA.ENTITY_ID,
        {
          changes: updatedSettings,
          previousSettings,
          newSettings: changes,
        }
      );

      const settings = await this.loadSettings();

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.UPDATE,
        'AFTER',
        {
          actor,
          previousSettings,
          settings,
          updated: updatedSettings.map(setting => setting.key),
        }
      );

      return {
        settings,
        updated: updatedSettings.map(setting => setting.key),
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.UPDATE,
        'FAILURE',
        {
          actor,
          changes,
          error,
        }
      );
      throw error;
    }
  }

  async resetSettings(
    request: UniversalRequest
  ): Promise<{ settings: MobileAppSettings; resetToDefaults: boolean; lastUpdated: string }> {
    const previousSettings = await this.loadSettings();
    const actor = controlPlaneHookService.getActorContext(request.user);

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.RESET,
        'BEFORE',
        {
          actor,
          previousSettings,
        }
      );

      await this.saveSetting(
        MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
        String(DEFAULT_MOBILE_APP_SETTINGS.offlineStorageEnabled)
      );
      await this.saveSetting(
        MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
        String(DEFAULT_MOBILE_APP_SETTINGS.batchUploadInterval)
      );
      await this.saveSetting(
        MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS,
        String(DEFAULT_MOBILE_APP_SETTINGS.maxOfflineEvents)
      );

      getAuditLogService().logActionFromRequest(
        request,
        MOBILE_APP_SETTINGS_ACTIONS.RESET,
        MOBILE_APP_METADATA.RESOURCE_TYPE,
        MOBILE_APP_METADATA.ENTITY_ID,
        {
          previousSettings,
          resetToDefaults: DEFAULT_MOBILE_APP_SETTINGS,
        }
      );

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.RESET,
        'AFTER',
        {
          actor,
          previousSettings,
          settings: DEFAULT_MOBILE_APP_SETTINGS,
        }
      );

      return {
        settings: DEFAULT_MOBILE_APP_SETTINGS,
        resetToDefaults: true,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.MOBILE.APP.SETTINGS.RESET,
        'FAILURE',
        {
          actor,
          error,
        }
      );
      throw error;
    }
  }

  private async loadSettings(): Promise<MobileAppSettings> {
    const settings = await loadAppSettingValueMapByKeys(Object.values(MOBILE_APP_SETTING_KEYS));

    return {
      offlineStorageEnabled: settings.get(MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED) !== 'false',
      batchUploadInterval: this.parseNumber(
        settings.get(MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL),
        DEFAULT_MOBILE_APP_SETTINGS.batchUploadInterval
      ),
      maxOfflineEvents: this.parseNumber(
        settings.get(MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS),
        DEFAULT_MOBILE_APP_SETTINGS.maxOfflineEvents
      ),
    };
  }

  private async saveSetting(key: string, value: string): Promise<void> {
    await upsertAppSetting({
      key,
      value,
      category: MOBILE_APP_METADATA.CATEGORY,
      type: MOBILE_APP_METADATA.DATA_TYPE,
      description: `Mobile app settings: ${key}`,
    });
  }

  private validateSettings(settings: Partial<MobileAppSettings>): void {
    if (
      typeof settings.batchUploadInterval === 'number' &&
      (settings.batchUploadInterval < 60 || settings.batchUploadInterval > 3600)
    ) {
      throw new Error('BATCH_UPLOAD_INTERVAL_INVALID');
    }

    if (
      typeof settings.maxOfflineEvents === 'number' &&
      (settings.maxOfflineEvents < 100 || settings.maxOfflineEvents > 10000)
    ) {
      throw new Error('MAX_OFFLINE_EVENTS_INVALID');
    }
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
}

export const mobileAppSettingsService = new MobileAppSettingsService();
