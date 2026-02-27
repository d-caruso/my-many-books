// ================================================================
// src/controllers/admin/AdminMobileAppSettingsController.ts
// Mobile App general settings management controller
// Manages global mobile app infrastructure settings—offline storage, batch intervals, and event limits
// ================================================================

 import { BaseController } from '../base/BaseController';
 import { ApiResponse } from '../../common/ApiResponse';
 import { UniversalRequest } from '../../types';
 import { AppSetting } from '../../models';
 import { AppSettingCreationAttributes } from '../../models/AppSetting';
 import { getAuditLogService } from '../../services/AuditLogService';
 import {
    MOBILE_APP_METADATA,
    MOBILE_APP_SETTING_KEYS,
    MOBILE_APP_SETTINGS_ACTIONS,
    MobileAppSettings,
    SettingCategory,
    SettingType,
} from '@my-many-books/shared-types';

const DEFAULT_MOBILE_APP_SETTINGS: MobileAppSettings = {
    offlineStorageEnabled: true,
    batchUploadInterval: 300, // 5 minutes
    maxOfflineEvents: 1000,
};

// settings messages
const MOBILE_APP_SETTINGS_MESSAGES = {
  SUCCESS: {
    UPDATED: 'Mobile settings updated successfully',
    RESET: 'Mobile settings reset to defaults successfully',
  },
  ERRORS: {
    FETCH_FAILED: 'Failed to fetch mobile settings',
    UPDATE_FAILED: 'Failed to update mobile settings',
    RESET_FAILED: 'Failed to reset mobile settings',
    STATUS_FAILED: 'Failed to get mobile settings status',
    BATCH_INTERVAL_INVALID: 'Batch upload interval must be between 60 and 3600 seconds',
    MAX_EVENTS_INVALID: 'Max offline events must be between 100 and 10000',
  },
  HEALTH_ISSUES: {
    LOW_BATCH_INTERVAL: 'Batch upload interval is too low (< 60 seconds)',
    HIGH_EVENTS_LIMIT: 'High offline events limit may impact performance',
    DISABLED_FEATURES: 'Both analytics and error reporting are disabled',
  },
} as const;

// create a const for the keys of MobileAppSettings, so it can be used in type-safe manner
// e.g. MobileAppSettingsKeys.offlineStorageEnabled
type MobileAppSettingsKeyName = keyof MobileAppSettings;
const MobileAppSettingsKeyNames = Object.keys(DEFAULT_MOBILE_APP_SETTINGS) as MobileAppSettingsKeyName[];
const MobileAppSettingsKeys = Object.fromEntries(
  MobileAppSettingsKeyNames.map((k) => [k, k]),
) as { [K in MobileAppSettingsKeyName]: K };

export class AdminMobileAppSettingsController extends BaseController {

    /**
    * GET /api/<version>/admin/mobile-app/settings
    * Get current mobile app global settings
    */
  async getSettings(request: UniversalRequest): Promise<ApiResponse> {
    // Load from mobile.app.global.* keys
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const settings = await this.loadSettings();

      return this.createSuccessResponse({
        settings,
        lastUpdated: await this.getLastUpdated(),
        version: MOBILE_APP_METADATA.VERSION,
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to fetch mobile app settings', 500);
    }
  }

  /**
   * Get the last updated timestamp for mobile app settings
   */
  private async getLastUpdated(): Promise<string | null> {
    const lastSetting = await AppSetting.findOne({
      where: {
        key: Object.values(MOBILE_APP_SETTING_KEYS),
      },
      order: [['updateDate', 'DESC']],
    });

    return lastSetting?.updateDate?.toISOString() || null;
  }

   /**
    * PUT /api/<version>/admin/mobile-app/settings
    * Update mobile app global settings
    */
   async updateSettings(request: UniversalRequest): Promise<ApiResponse> {
    // Validate batch interval (60-3600s) and max events (100-10000)
    // Save to mobile.app.global.* keys
    // Log audit event

    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<MobileAppSettings>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    // Validate settings values
    const validationError = this.validateSettings(body);
    if (validationError) {
      return validationError;
    }

    try {
        const previousSettings = await this.loadSettings();
        const updatedSettings: Array<{ key: string; value: string }> = [];

        // Update each settings value that was provided
        if (typeof body.offlineStorageEnabled === 'boolean') {
            await this.saveSetting(
                MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
                String(body.offlineStorageEnabled)
            );
            updatedSettings.push({ key: MobileAppSettingsKeys.offlineStorageEnabled, value: String(body.offlineStorageEnabled) });
        }

        if (typeof body.batchUploadInterval === 'number') {
            await this.saveSetting(
                MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
                String(body.batchUploadInterval)
            );
            updatedSettings.push({ key: MobileAppSettingsKeys.batchUploadInterval, value: String(body.batchUploadInterval) });
        }

        if (typeof body.maxOfflineEvents === 'number') {
            await this.saveSetting(
                MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS,
                String(body.maxOfflineEvents)
            );
            updatedSettings.push({ key: MobileAppSettingsKeys.maxOfflineEvents, value: String(body.maxOfflineEvents) });
        }

        // Log audit event
        getAuditLogService().logActionFromRequest(
            request,
            MOBILE_APP_SETTINGS_ACTIONS.UPDATE,
            MOBILE_APP_METADATA.RESOURCE_TYPE,
            MOBILE_APP_METADATA.ENTITY_ID,
            {
                changes: updatedSettings,
                previousSettings,
                newSettings: body,
            }
        );

        const newSettings = await this.loadSettings();

        return this.createSuccessResponse(
        {
            settings: newSettings,
            updated: updatedSettings.map(s => s.key),
            lastUpdated: new Date().toISOString(),
        },
        MOBILE_APP_SETTINGS_MESSAGES.SUCCESS.UPDATED
        );
    } catch (error) {
        if (error instanceof Error) {
          return this.createErrorResponse(error.message, 500);
        }
        return this.createErrorResponse(MOBILE_APP_SETTINGS_MESSAGES.ERRORS.UPDATE_FAILED, 500);
    }
   }

   /**
    * POST /api/<version>/admin/mobile-app/settings/reset
    * Reset mobile app settings to defaults
    */
   async resetSettings(request: UniversalRequest): Promise<ApiResponse> {
     // Reset to DEFAULT_MOBILE_APP_SETTINGS
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
        const previousSettings = await this.loadSettings();

        // Reset all settings to defaults
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

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'reset',
        MOBILE_APP_METADATA.RESOURCE_TYPE,
        MOBILE_APP_METADATA.ENTITY_ID,
        {
          previousSettings,
          resetToDefaults: DEFAULT_MOBILE_APP_SETTINGS,
        }
      );

      return this.createSuccessResponse(
        {
          settings: DEFAULT_MOBILE_APP_SETTINGS,
          resetToDefaults: true,
          lastUpdated: new Date().toISOString(),
        },
        'Mobile settings reset to defaults successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to reset mobile settings', 500);
    }
  }

  /**
   * Get mobile settings validation rules
   */
  async getMobileSettingsSchema(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const schema = {
      properties: {
        [MobileAppSettingsKeys.offlineStorageEnabled]: {
          type: 'boolean',
          description: 'Enable or disable offline storage',
          default: true,
        },
        [MobileAppSettingsKeys.batchUploadInterval]: {
          type: 'number',
          description: 'Batch upload interval in seconds',
          minimum: 60,
          maximum: 3600,
          default: 300,
        },
        [MobileAppSettingsKeys.maxOfflineEvents]: {
          type: 'number',
          description: 'Maximum number of offline events to store',
          minimum: 100,
          maximum: 10000,
          default: 1000,
        },
      },
      required: [],
      defaults: DEFAULT_MOBILE_APP_SETTINGS,
    };

    return this.createSuccessResponse({
      schema,
      version: '1.0.0',
    });
  }

  /**
   * Load current mobile settings from database
   */
  private async loadSettings(): Promise<MobileAppSettings> {
    const settings = await AppSetting.findAll({
      where: {
        key: Object.values(MOBILE_APP_SETTING_KEYS),
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      offlineStorageEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED),
        DEFAULT_MOBILE_APP_SETTINGS.offlineStorageEnabled
      ),
      batchUploadInterval: this.parseNumber(
        settingsMap.get(MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL),
        DEFAULT_MOBILE_APP_SETTINGS.batchUploadInterval
      ),
      maxOfflineEvents: this.parseNumber(
        settingsMap.get(MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS),
        DEFAULT_MOBILE_APP_SETTINGS.maxOfflineEvents
      ),
    };
  }

  /**
   * Update a single setting
   */
  private async saveSetting(key: string, value: string): Promise<void> {
    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value,
        active: true,
        category: MOBILE_APP_METADATA.CATEGORY as SettingCategory,
        type: MOBILE_APP_METADATA.DATA_TYPE as SettingType,
        defaultValue: value,
        description: `Mobile app settings: ${key}`,
        deleted: false,
      } as AppSettingCreationAttributes,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }

  /**
   * Validate mobile settings values
   */
  private validateSettings(settings: MobileAppSettings): ApiResponse | null {
    if (typeof settings.batchUploadInterval === 'number') {
      if (settings.batchUploadInterval < 60 || settings.batchUploadInterval > 3600) {
        return this.createErrorResponse(
          'Batch upload interval must be between 60 and 3600 seconds',
          400
        );
      }
    }

    if (typeof settings.maxOfflineEvents === 'number') {
      if (settings.maxOfflineEvents < 100 || settings.maxOfflineEvents > 10000) {
        return this.createErrorResponse('Max offline events must be between 100 and 10000', 400);
      }
    }

    return null;
  }
}

export const adminMobileAppSettingsController = new AdminMobileAppSettingsController();