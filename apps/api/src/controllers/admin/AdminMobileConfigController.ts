// ================================================================
// src/controllers/admin/AdminMobileConfigController.ts
// Mobile hook configuration management controller
// manages listener-level mobile config and operational state—fetch/update listener flags and limits, reset defaults, emergency enable/disable, health/status reporting
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { getAuditLogService } from '../../services/AuditLogService';
import {
  MOBILE_HOOKS,
  MOBILE_CONFIG_CONSTANTS,
  MOBILE_CONFIG_ACTIONS,
  MobileHookListenerConfig,
} from '@my-many-books/shared-types';

export interface MobileConfigUpdateRequest {
  analyticsEnabled?: boolean;
  errorReportingEnabled?: boolean;
  offlineStorageEnabled?: boolean;
  performanceMonitoringEnabled?: boolean;
  batchUploadInterval?: number;
  maxOfflineEvents?: number;
}

export interface EmergencyStatusRequest {
  enabled: boolean;
  reason?: string;
}

// Configuration messages
export const MOBILE_CONFIG_MESSAGES = {
  SUCCESS: {
    UPDATED: 'Mobile configuration updated successfully',
    RESET: 'Mobile configuration reset to defaults successfully',
  },
  ERRORS: {
    FETCH_FAILED: 'Failed to fetch mobile configuration',
    UPDATE_FAILED: 'Failed to update mobile configuration',
    RESET_FAILED: 'Failed to reset mobile configuration',
    STATUS_FAILED: 'Failed to get mobile configuration status',
    BATCH_INTERVAL_INVALID: 'Batch upload interval must be between 60 and 3600 seconds',
    MAX_EVENTS_INVALID: 'Max offline events must be between 100 and 10000',
  },
  HEALTH_ISSUES: {
    LOW_BATCH_INTERVAL: 'Batch upload interval is too low (< 60 seconds)',
    HIGH_EVENTS_LIMIT: 'High offline events limit may impact performance',
    DISABLED_FEATURES: 'Both analytics and error reporting are disabled',
  },
} as const;

const DEFAULT_MOBILE_CONFIG: MobileHookListenerConfig = {
  analyticsEnabled: true,
  errorReportingEnabled: true,
  offlineStorageEnabled: true,
  performanceMonitoringEnabled: true,
  batchUploadInterval: 300, // 5 minutes
  maxOfflineEvents: 1000,
};

export class AdminMobileConfigController extends BaseController {
  /**
   * Get current mobile hook listener configuration
   */
  async getMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const config = await this.loadMobileConfig();

      return this.createSuccessResponse({
        config,
        lastUpdated: await this.getLastUpdated(),
        version: MOBILE_CONFIG_CONSTANTS.VERSION,
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(MOBILE_CONFIG_MESSAGES.ERRORS.FETCH_FAILED, 500);
    }
  }

  /**
   * Update mobile hook listener configuration
   */
  async updateMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<MobileConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    // Validate configuration values
    const validationError = this.validateMobileConfig(body);
    if (validationError) {
      return validationError;
    }

    try {
      const oldConfig = await this.loadMobileConfig();
      const updatedSettings: Array<{ key: string; value: string }> = [];

      // Update each configuration value that was provided
      if (typeof body.analyticsEnabled === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.ANALYTICS_ENABLED,
          String(body.analyticsEnabled)
        );
        updatedSettings.push({ key: 'analyticsEnabled', value: String(body.analyticsEnabled) });
      }

      if (typeof body.errorReportingEnabled === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.ERROR_REPORTING_ENABLED,
          String(body.errorReportingEnabled)
        );
        updatedSettings.push({
          key: 'errorReportingEnabled',
          value: String(body.errorReportingEnabled),
        });
      }

      if (typeof body.offlineStorageEnabled === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.OFFLINE_STORAGE_ENABLED,
          String(body.offlineStorageEnabled)
        );
        updatedSettings.push({
          key: 'offlineStorageEnabled',
          value: String(body.offlineStorageEnabled),
        });
      }

      if (typeof body.performanceMonitoringEnabled === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.PERFORMANCE_MONITORING_ENABLED,
          String(body.performanceMonitoringEnabled)
        );
        updatedSettings.push({
          key: 'performanceMonitoringEnabled',
          value: String(body.performanceMonitoringEnabled),
        });
      }

      if (typeof body.batchUploadInterval === 'number') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.BATCH_UPLOAD_INTERVAL,
          String(body.batchUploadInterval)
        );
        updatedSettings.push({
          key: 'batchUploadInterval',
          value: String(body.batchUploadInterval),
        });
      }

      if (typeof body.maxOfflineEvents === 'number') {
        await this.updateConfigSetting(
          MOBILE_HOOKS.MAX_OFFLINE_EVENTS,
          String(body.maxOfflineEvents)
        );
        updatedSettings.push({ key: 'maxOfflineEvents', value: String(body.maxOfflineEvents) });
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        MOBILE_CONFIG_ACTIONS.UPDATE,
        MOBILE_CONFIG_CONSTANTS.RESOURCE_TYPE,
        MOBILE_CONFIG_CONSTANTS.ENTITY_ID,
        {
          changes: updatedSettings,
          oldConfig,
          newConfig: body,
        }
      );

      const newConfig = await this.loadMobileConfig();

      return this.createSuccessResponse(
        {
          config: newConfig,
          updated: updatedSettings.map(s => s.key),
          lastUpdated: new Date().toISOString(),
        },
        MOBILE_CONFIG_MESSAGES.SUCCESS.UPDATED
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(MOBILE_CONFIG_MESSAGES.ERRORS.UPDATE_FAILED, 500);
    }
  }

  /**
   * Reset mobile hook listener configuration to defaults
   */
  async resetMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const oldConfig = await this.loadMobileConfig();

      // Reset all settings to defaults
      await this.updateConfigSetting(
        MOBILE_HOOKS.ANALYTICS_ENABLED,
        String(DEFAULT_MOBILE_CONFIG.analyticsEnabled)
      );
      await this.updateConfigSetting(
        MOBILE_HOOKS.ERROR_REPORTING_ENABLED,
        String(DEFAULT_MOBILE_CONFIG.errorReportingEnabled)
      );
      await this.updateConfigSetting(
        MOBILE_HOOKS.OFFLINE_STORAGE_ENABLED,
        String(DEFAULT_MOBILE_CONFIG.offlineStorageEnabled)
      );
      await this.updateConfigSetting(
        MOBILE_HOOKS.PERFORMANCE_MONITORING_ENABLED,
        String(DEFAULT_MOBILE_CONFIG.performanceMonitoringEnabled)
      );
      await this.updateConfigSetting(
        MOBILE_HOOKS.BATCH_UPLOAD_INTERVAL,
        String(DEFAULT_MOBILE_CONFIG.batchUploadInterval)
      );
      await this.updateConfigSetting(
        MOBILE_HOOKS.MAX_OFFLINE_EVENTS,
        String(DEFAULT_MOBILE_CONFIG.maxOfflineEvents)
      );

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'reset',
        'mobile_config',
        'mobile_hook_listeners',
        {
          oldConfig,
          resetToDefaults: DEFAULT_MOBILE_CONFIG,
        }
      );

      return this.createSuccessResponse(
        {
          config: DEFAULT_MOBILE_CONFIG,
          resetToDefaults: true,
          lastUpdated: new Date().toISOString(),
        },
        'Mobile configuration reset to defaults successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to reset mobile configuration', 500);
    }
  }

  /**
   * Get mobile configuration validation rules
   */
  async getMobileConfigSchema(request: UniversalRequest): Promise<ApiResponse> {
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
      defaults: DEFAULT_MOBILE_CONFIG,
    };

    return this.createSuccessResponse({
      schema,
      version: '1.0.0',
    });
  }

  /**
   * Get mobile configuration status and health
   */
  async getMobileConfigStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const config = await this.loadMobileConfig();
      const lastUpdated = await this.getLastUpdated();

      // Calculate configuration health score
      let healthScore = 100;
      const issues: string[] = [];

      // Check for potential configuration issues
      if (config.batchUploadInterval < 60) {
        healthScore -= 10;
        issues.push('Batch upload interval is too low (< 60 seconds)');
      }

      if (config.maxOfflineEvents > 5000) {
        healthScore -= 5;
        issues.push('High offline events limit may impact performance');
      }

      if (!config.analyticsEnabled && !config.errorReportingEnabled) {
        healthScore -= 15;
        issues.push('Both analytics and error reporting are disabled');
      }

      const status = {
        config,
        lastUpdated,
        health: {
          score: Math.max(0, healthScore),
          status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
          issues,
        },
        enabledFeatures: {
          analytics: config.analyticsEnabled,
          errorReporting: config.errorReportingEnabled,
          offlineStorage: config.offlineStorageEnabled,
          performanceMonitoring: config.performanceMonitoringEnabled,
        },
        statistics: {
          totalListeners: Object.values(config).filter(v => typeof v === 'boolean' && v).length,
          estimatedMemoryUsage: this.estimateMemoryUsage(config),
        },
      };

      return this.createSuccessResponse(status);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to get mobile configuration status', 500);
    }
  }

  /**
   * Load current mobile configuration from database
   */
  private async loadMobileConfig(): Promise<MobileHookListenerConfig> {
    const settings = await AppSetting.findAll({
      where: {
        key: Object.values(MOBILE_HOOKS),
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    return {
      analyticsEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOKS.ANALYTICS_ENABLED),
        DEFAULT_MOBILE_CONFIG.analyticsEnabled
      ),
      errorReportingEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOKS.ERROR_REPORTING_ENABLED),
        DEFAULT_MOBILE_CONFIG.errorReportingEnabled
      ),
      offlineStorageEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOKS.OFFLINE_STORAGE_ENABLED),
        DEFAULT_MOBILE_CONFIG.offlineStorageEnabled
      ),
      performanceMonitoringEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOKS.PERFORMANCE_MONITORING_ENABLED),
        DEFAULT_MOBILE_CONFIG.performanceMonitoringEnabled
      ),
      batchUploadInterval: this.parseNumber(
        settingsMap.get(MOBILE_HOOKS.BATCH_UPLOAD_INTERVAL),
        DEFAULT_MOBILE_CONFIG.batchUploadInterval
      ),
      maxOfflineEvents: this.parseNumber(
        settingsMap.get(MOBILE_HOOKS.MAX_OFFLINE_EVENTS),
        DEFAULT_MOBILE_CONFIG.maxOfflineEvents
      ),
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
        category: 'mobile_hooks',
        type: 'string',
        defaultValue: value,
        description: `Mobile hook listener configuration: ${key}`,
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
        where: { key: MOBILE_HOOKS.EMERGENCY_ENABLED },
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
      await this.updateConfigSetting(MOBILE_HOOKS.EMERGENCY_ENABLED, String(body.enabled));

      if (body.reason) {
        await this.updateConfigSetting(MOBILE_HOOKS.EMERGENCY_REASON, body.reason);
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        body.enabled ? 'emergency_enable' : 'emergency_disable',
        MOBILE_CONFIG_CONSTANTS.RESOURCE_TYPE,
        MOBILE_CONFIG_CONSTANTS.ENTITY_ID,
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
   * Validate mobile configuration values
   */
  private validateMobileConfig(config: MobileConfigUpdateRequest): ApiResponse | null {
    if (typeof config.batchUploadInterval === 'number') {
      if (config.batchUploadInterval < 60 || config.batchUploadInterval > 3600) {
        return this.createErrorResponse(
          'Batch upload interval must be between 60 and 3600 seconds',
          400
        );
      }
    }

    if (typeof config.maxOfflineEvents === 'number') {
      if (config.maxOfflineEvents < 100 || config.maxOfflineEvents > 10000) {
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
      const config = await this.loadMobileConfig();
      const emergencyEnabled = await this.isEmergencyEnabled();

      const checks = {
        configLoaded: true,
        emergencyEnabled,
        analyticsActive: config.analyticsEnabled && emergencyEnabled,
        errorReportingActive: config.errorReportingEnabled && emergencyEnabled,
        offlineStorageActive: config.offlineStorageEnabled && emergencyEnabled,
        performanceMonitoringActive: config.performanceMonitoringEnabled && emergencyEnabled,
      };

      const activeCount = Object.values(checks).filter(v => v === true).length;
      const totalCount = Object.keys(checks).length;
      const healthScore = Math.round((activeCount / totalCount) * 100);

      return this.createSuccessResponse({
        status: emergencyEnabled ? (healthScore >= 80 ? 'healthy' : 'degraded') : 'disabled',
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
      where: { key: MOBILE_HOOKS.EMERGENCY_ENABLED },
    });
    return setting?.value !== 'false';
  }

  private async getEmergencyReason(): Promise<string | null> {
    const setting = await AppSetting.findOne({
      where: { key: MOBILE_HOOKS.EMERGENCY_REASON },
    });
    return setting?.value || null;
  }

  /**
   * Get the last updated timestamp for mobile configuration
   */
  private async getLastUpdated(): Promise<string | null> {
    const lastSetting = await AppSetting.findOne({
      where: {
        key: Object.values(MOBILE_HOOKS),
      },
      order: [['updateDate', 'DESC']],
    });

    return lastSetting?.updateDate?.toISOString() || null;
  }

  /**
   * Estimate memory usage based on configuration
   */
  private estimateMemoryUsage(config: MobileHookListenerConfig): string {
    let estimatedKB = 50; // Base usage

    if (config.analyticsEnabled) estimatedKB += 20;
    if (config.errorReportingEnabled) estimatedKB += 15;
    if (config.offlineStorageEnabled) estimatedKB += config.maxOfflineEvents * 0.1;
    if (config.performanceMonitoringEnabled) estimatedKB += 30;

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

export const adminMobileConfigController = new AdminMobileConfigController();
