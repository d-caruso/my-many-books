// ================================================================
// src/controllers/admin/AdminMobileHooksSettingsController.ts
// Mobile hook settings management controller
// manages listener-level mobile settings and operational state—fetch/update listener flags and limits, reset defaults, emergency enable/disable, health/status reporting
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { AppSettingCreationAttributes } from '../../models/AppSetting';
import { getAuditLogService } from '../../services/AuditLogService';
import {
  MOBILE_HOOK_SETTING_KEYS,
  MOBILE_HOOKS_METADATA,
  MOBILE_HOOKS_SETTINGS_ACTIONS,
  MobileHooksListenerSettings,
  HEALTH_STATUS,
  SettingCategory,
  SettingType,
} from '@my-many-books/shared-types';

export interface EmergencyStatusRequest {
  enabled: boolean;
  reason?: string;
}

// settings messages
const MOBILE_HOOKS_SETTINGS_MESSAGES = {
  SUCCESS: {
    UPDATED: 'Mobile hooks settings updated successfully',
    RESET: 'Mobile hooks settings reset to defaults successfully',
  },
  ERRORS: {
    FETCH_FAILED: 'Failed to fetch mobile hooks settings',
    UPDATE_FAILED: 'Failed to update mobile hooks settings',
    RESET_FAILED: 'Failed to reset mobile hooks settings',
    STATUS_FAILED: 'Failed to get mobile settings status',
  },
  HEALTH_ISSUES: {
    DISABLED_FEATURES: 'Both analytics and error reporting are disabled',
  },
} as const;

const DEFAULT_LISTENER_SETTINGS: MobileHooksListenerSettings = {
  analyticsEnabled: true,
  errorReportingEnabled: true,
  performanceMonitoringEnabled: true,
};

export class AdminMobileHooksSettingsController extends BaseController {
  /**
   * Get current mobile hook listener settings
   */
  async getListenerSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const settings = await this.loadSettings();

      return this.createSuccessResponse({
        settings,
        lastUpdated: await this.getLastUpdated(),
        version: MOBILE_HOOKS_METADATA.VERSION,
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(MOBILE_HOOKS_SETTINGS_MESSAGES.ERRORS.FETCH_FAILED, 500);
    }
  }

  /**
   * Update mobile hook listener settings
   */
  async updateListenerSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<MobileHooksListenerSettings>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const previousSettings = await this.loadSettings();
      const updatedSettings: Array<{ key: string; value: string }> = [];

      // Update each settings value that was provided
      if (typeof body.analyticsEnabled === 'boolean') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
          String(body.analyticsEnabled)
        );
        updatedSettings.push({ key: 'analyticsEnabled', value: String(body.analyticsEnabled) });
      }

      if (typeof body.errorReportingEnabled === 'boolean') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
          String(body.errorReportingEnabled)
        );
        updatedSettings.push({
          key: 'errorReportingEnabled',
          value: String(body.errorReportingEnabled),
        });
      }

      if (typeof body.performanceMonitoringEnabled === 'boolean') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
          String(body.performanceMonitoringEnabled)
        );
        updatedSettings.push({
          key: 'performanceMonitoringEnabled',
          value: String(body.performanceMonitoringEnabled),
        });
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        MOBILE_HOOKS_SETTINGS_ACTIONS.UPDATE,
        MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
        MOBILE_HOOKS_METADATA.ENTITY_ID,
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
        MOBILE_HOOKS_SETTINGS_MESSAGES.SUCCESS.UPDATED
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(MOBILE_HOOKS_SETTINGS_MESSAGES.ERRORS.UPDATE_FAILED, 500);
    }
  }

  /**
   * Reset mobile hook listener settings to defaults
   */
  async resetMobileSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const previousSettings = await this.loadSettings();

      // Reset all settings to defaults
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
        String(DEFAULT_LISTENER_SETTINGS.analyticsEnabled)
      );
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
        String(DEFAULT_LISTENER_SETTINGS.errorReportingEnabled)
      );
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
        String(DEFAULT_LISTENER_SETTINGS.performanceMonitoringEnabled)
      );

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'reset',
        MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
        MOBILE_HOOKS_METADATA.ENTITY_ID,
        {
          previousSettings,
          resetToDefaults: DEFAULT_LISTENER_SETTINGS,
        }
      );

      return this.createSuccessResponse(
        {
          settings: DEFAULT_LISTENER_SETTINGS,
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
        analyticsEnabled: {
          type: 'boolean',
          description: 'Enable analytics event tracking',
          default: true,
        },
        errorReportingEnabled: {
          type: 'boolean',
          description: 'Enable error and crash reporting',
          default: true,
        },
        performanceMonitoringEnabled: {
          type: 'boolean',
          description: 'Enable performance monitoring',
          default: true,
        },
      },
      required: [],
      defaults: DEFAULT_LISTENER_SETTINGS,
    };

    return this.createSuccessResponse({
      schema,
      version: '1.0.0',
    });
  }

  /**
   * Load current mobile settings from database
   */
  private async loadSettings(): Promise<MobileHooksListenerSettings> {
    const settings = await AppSetting.findAll({
      where: {
        key: Object.values(MOBILE_HOOK_SETTING_KEYS),
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      analyticsEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED),
        DEFAULT_LISTENER_SETTINGS.analyticsEnabled
      ),
      errorReportingEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED),
        DEFAULT_LISTENER_SETTINGS.errorReportingEnabled
      ),
      performanceMonitoringEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED),
        DEFAULT_LISTENER_SETTINGS.performanceMonitoringEnabled
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
        category: MOBILE_HOOKS_METADATA.CATEGORY as SettingCategory,
        type: MOBILE_HOOKS_METADATA.DATA_TYPE as SettingType,
        defaultValue: value,
        description: `Mobile hook settings: ${key}`,
        deleted: false,
      } as AppSettingCreationAttributes,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }

  /**
   * Get current emergency status
   */
  async getEmergencyStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const setting = await AppSetting.findOne({
        where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED },
      });

      return this.createSuccessResponse({
        enabled: setting?.value !== 'false',
        disabledAt: setting?.value === 'false' ? setting.updateDate : null,
        disabledReason: await this.getEmergencyReason(),
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to get emergency status', 500);
    }
  }

  /**
   * Update emergency status (enable/disable all mobile hooks)
   */
  async updateEmergencyStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<EmergencyStatusRequest>(request);
    if (body === null || typeof body.enabled !== 'boolean') {
      return this.createErrorResponse('Invalid request: enabled (boolean) is required', 400);
    }

    try {
      await this.saveSetting(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED, String(body.enabled));

      if (body.reason) {
        await this.saveSetting(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON, body.reason);
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        body.enabled ? 'emergency_enable' : 'emergency_disable',
        MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
        MOBILE_HOOKS_METADATA.ENTITY_ID,
        { enabled: body.enabled, reason: body.reason }
      );

      return this.createSuccessResponse({
        enabled: body.enabled,
        updatedAt: new Date().toISOString(),
        message: body.enabled ? 'Mobile hooks enabled' : 'Mobile hooks disabled (emergency)',
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to update emergency status', 500);
    }
  }

  /**
   * Get mobile hooks health status
   */
  async getHealth(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const settings = await this.loadSettings();
      const emergencyEnabled = await this.isEmergencyEnabled();

      const checks = {
        settingsLoaded: true,
        emergencyEnabled,
        analyticsActive: settings.analyticsEnabled && emergencyEnabled,
        errorReportingActive: settings.errorReportingEnabled && emergencyEnabled,
        performanceMonitoringActive: settings.performanceMonitoringEnabled && emergencyEnabled,
      };

      const activeCount = Object.values(checks).filter(v => v === true).length;
      const totalCount = Object.keys(checks).length;
      const healthScore = Math.round((activeCount / totalCount) * 100);

      return this.createSuccessResponse({
        status: emergencyEnabled ? (healthScore >= 80 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED) : HEALTH_STATUS.DISABLED,
        healthScore,
        checks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
        return this.createSuccessResponse({
          status: 'error',
          healthScore: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
    }
  }

  private async isEmergencyEnabled(): Promise<boolean> {
    const setting = await AppSetting.findOne({
      where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED },
    });
    return setting?.value !== 'false';
  }

  private async getEmergencyReason(): Promise<string | null> {
    const setting = await AppSetting.findOne({
      where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON },
    });
    return setting?.value || null;
  }

  /**
   * Get the last updated timestamp for mobile settings
   */
  private async getLastUpdated(): Promise<string | null> {
    const lastSetting = await AppSetting.findOne({
      where: {
        key: Object.values(MOBILE_HOOK_SETTING_KEYS),
      },
      order: [['updateDate', 'DESC']],
    });

    return lastSetting?.updateDate?.toISOString() || null;
  }
}

export const adminMobileHooksSettingsController = new AdminMobileHooksSettingsController();