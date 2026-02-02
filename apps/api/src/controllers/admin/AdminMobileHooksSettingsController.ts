// ================================================================
// src/controllers/admin/AdminMobileHooksSettingsController.ts
// Mobile hook settings management controller
// manages listener-level mobile settings and operational state—fetch/update listener flags and limits, reset defaults, emergency enable/disable, health/status reporting
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { getAuditLogService } from '../../services/AuditLogService';
import {
  MOBILE_HOOK_SETTING_KEYS,
  MOBILE_HOOKS_METADATA,
  MOBILE_HOOKS_SETTINGS_ACTIONS,
  MobileHooksListenerSettings,
  HEALTH_STATUS
} from '@my-many-books/shared-types';

export interface EmergencyStatusRequest {
  enabled: boolean;
  reason?: string;
}

// settings messages
const MOBILE_SETTINGS_MESSAGES = {
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

const DEFAULT_LISTENER_SETTINGS: MobileHooksListenerSettings = {
  analyticsEnabled: true,
  errorReportingEnabled: true,
  offlineStorageEnabled: true,
  performanceMonitoringEnabled: true,
  batchUploadInterval: 300, // 5 minutes
  maxOfflineEvents: 1000,
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
      return this.createErrorResponse(MOBILE_SETTINGS_MESSAGES.ERRORS.FETCH_FAILED, 500);
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

    // Validate settings values
    const validationError = this.validateMobileSettings(body);
    if (validationError) {
      return validationError;
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

      if (typeof body.offlineStorageEnabled === 'boolean') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
          String(body.offlineStorageEnabled)
        );
        updatedSettings.push({
          key: 'offlineStorageEnabled',
          value: String(body.offlineStorageEnabled),
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

      if (typeof body.batchUploadInterval === 'number') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
          String(body.batchUploadInterval)
        );
        updatedSettings.push({
          key: 'batchUploadInterval',
          value: String(body.batchUploadInterval),
        });
      }

      if (typeof body.maxOfflineEvents === 'number') {
        await this.saveSetting(
          MOBILE_HOOK_SETTING_KEYS.MAX_OFFLINE_EVENTS,
          String(body.maxOfflineEvents)
        );
        updatedSettings.push({ key: 'maxOfflineEvents', value: String(body.maxOfflineEvents) });
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
        MOBILE_SETTINGS_MESSAGES.SUCCESS.UPDATED
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(MOBILE_SETTINGS_MESSAGES.ERRORS.UPDATE_FAILED, 500);
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
        MOBILE_HOOK_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
        String(DEFAULT_LISTENER_SETTINGS.offlineStorageEnabled)
      );
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
        String(DEFAULT_LISTENER_SETTINGS.performanceMonitoringEnabled)
      );
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.BATCH_UPLOAD_INTERVAL,
        String(DEFAULT_LISTENER_SETTINGS.batchUploadInterval)
      );
      await this.saveSetting(
        MOBILE_HOOK_SETTING_KEYS.MAX_OFFLINE_EVENTS,
        String(DEFAULT_LISTENER_SETTINGS.maxOfflineEvents)
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
        offlineStorageEnabled: {
          type: 'boolean',
          description: 'Enable offline event storage',
          default: true,
        },
        performanceMonitoringEnabled: {
          type: 'boolean',
          description: 'Enable performance monitoring',
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
      defaults: DEFAULT_LISTENER_SETTINGS,
    };

    return this.createSuccessResponse({
      schema,
      version: '1.0.0',
    });
  }

  /**
   * Get mobile settings status and health
   */
  async getMobileSettingsStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const settings = await this.loadSettings();
      const lastUpdated = await this.getLastUpdated();

      // Calculate settings health score
      let healthScore = 100;
      const issues: string[] = [];

      // Check for potential settings issues
      if (settings.batchUploadInterval < 60) {
        healthScore -= 10;
        issues.push('Batch upload interval is too low (< 60 seconds)');
      }

      if (settings.maxOfflineEvents > 5000) {
        healthScore -= 5;
        issues.push('High offline events limit may impact performance');
      }

      if (!settings.analyticsEnabled && !settings.errorReportingEnabled) {
        healthScore -= 15;
        issues.push('Both analytics and error reporting are disabled');
      }

      const status = {
        settings,
        lastUpdated,
        health: {
          score: Math.max(0, healthScore),
          status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
          issues,
        },
        enabledFeatures: {
          analytics: settings.analyticsEnabled,
          errorReporting: settings.errorReportingEnabled,
          offlineStorage: settings.offlineStorageEnabled,
          performanceMonitoring: settings.performanceMonitoringEnabled,
        },
        statistics: {
          totalListeners: Object.values(settings).filter(v => typeof v === 'boolean' && v).length,
          estimatedMemoryUsage: this.estimateMemoryUsage(settings),
        },
      };

      return this.createSuccessResponse(status);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to get mobile settings status', 500);
    }
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
      offlineStorageEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.OFFLINE_STORAGE_ENABLED),
        DEFAULT_LISTENER_SETTINGS.offlineStorageEnabled
      ),
      performanceMonitoringEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED),
        DEFAULT_LISTENER_SETTINGS.performanceMonitoringEnabled
      ),
      batchUploadInterval: this.parseNumber(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.BATCH_UPLOAD_INTERVAL),
        DEFAULT_LISTENER_SETTINGS.batchUploadInterval
      ),
      maxOfflineEvents: this.parseNumber(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.MAX_OFFLINE_EVENTS),
        DEFAULT_LISTENER_SETTINGS.maxOfflineEvents
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
        category: MOBILE_HOOKS_METADATA.CATEGORY,
        type: MOBILE_HOOKS_METADATA.DATA_TYPE,
        defaultValue: value,
        description: `Mobile hook settings: ${key}`,
        deleted: false,
      } as any,
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
      return this.createErrorResponse('Failed to update emergency status', 500);
    }
  }

  /**
   * Validate mobile settings values
   */
  private validateMobileSettings(settings: MobileHooksListenerSettings): ApiResponse | null {
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
        offlineStorageActive: settings.offlineStorageEnabled && emergencyEnabled,
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

  /**
   * Estimate memory usage based on settings
   */
  private estimateMemoryUsage(settings: MobileHooksListenerSettings): string {
    let estimatedKB = 50; // Base usage

    if (settings.analyticsEnabled) estimatedKB += 20;
    if (settings.errorReportingEnabled) estimatedKB += 15;
    if (settings.offlineStorageEnabled) estimatedKB += settings.maxOfflineEvents * 0.1;
    if (settings.performanceMonitoringEnabled) estimatedKB += 30;

    if (estimatedKB < 1000) {
      return `${Math.round(estimatedKB)} KB`;
    } else {
      return `${(estimatedKB / 1000).toFixed(1)} MB`;
    }
  }

  /**
   * Parse boolean value from string
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true';
  }

  /**
   * Parse number value from string
   */
  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Ensure user is authenticated
   */
  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
  }
}

export const adminMobileHooksSettingsController = new AdminMobileHooksSettingsController();
