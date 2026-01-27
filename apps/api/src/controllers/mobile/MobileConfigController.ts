// ================================================================
// src/controllers/mobile/MobileConfigController.ts
// Mobile hook configuration endpoint (non-admin, read-only)
// Mobile app fetches its config via GET /api/config/mobile
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { MOBILE_HOOK_SETTING_KEYS } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

export interface MobileConfigResponse {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  offlineStorageEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  batchUploadInterval: number;
  maxOfflineEvents: number;
  emergencyEnabled: boolean;
  emergencyReason: string | null;
}

export class MobileConfigController extends BaseController {
  /**
   * GET /api/config/mobile
   * Mobile app fetches its configuration
   */
  async getMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const config = await this.loadConfig();
      return this.createSuccessResponse(config);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to fetch mobile configuration', 500);
    }
  }

  /**
   * Load mobile configuration from database
   */
  private async loadConfig(): Promise<MobileConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: 'mobile.hooks.%'
        },
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Default values
    const defaults = {
      analyticsEnabled: true,
      errorReportingEnabled: true,
      offlineStorageEnabled: true,
      performanceMonitoringEnabled: true,
      batchUploadInterval: 300,
      maxOfflineEvents: 1000,
      emergencyEnabled: false,
      emergencyReason: null as string | null,
    };

    return {
      analyticsEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED),
        defaults.analyticsEnabled
      ),
      errorReportingEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED),
        defaults.errorReportingEnabled
      ),
      offlineStorageEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.OFFLINE_STORAGE_ENABLED),
        defaults.offlineStorageEnabled
      ),
      performanceMonitoringEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED),
        defaults.performanceMonitoringEnabled
      ),
      batchUploadInterval: this.parseNumber(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.BATCH_UPLOAD_INTERVAL),
        defaults.batchUploadInterval
      ),
      maxOfflineEvents: this.parseNumber(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.MAX_OFFLINE_EVENTS),
        defaults.maxOfflineEvents
      ),
      emergencyEnabled: this.parseBoolean(
        settingsMap.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED),
        defaults.emergencyEnabled
      ),
      emergencyReason: settingsMap.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON) || defaults.emergencyReason,
    };
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
}

export const mobileConfigController = new MobileConfigController();
