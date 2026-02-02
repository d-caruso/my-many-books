// ================================================================
// src/controllers/mobile/MobileConfigController.ts
// Mobile endpoint for APP and HOOKS configurations (non-admin, read-only)
// Mobile app fetches its config via GET /api/config/mobile
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { MOBILE_HOOK_SETTING_KEYS, MOBILE_APP_SETTING_KEYS, BASE_HOOKS } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

interface MobileConfigResponse {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  offlineStorageEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  batchUploadInterval: number;
  maxOfflineEvents: number;
  emergencyEnabled: boolean;
  emergencyReason: string | null;
}

interface MobileHooksConfigResponse {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  emergencyEnabled: boolean;
  emergencyReason: string | null;
}

interface MobileAppConfigResponse {
  offlineStorageEnabled: boolean;
  batchUploadInterval: number;
  maxOfflineEvents: number;
}


export class MobileConfigController extends BaseController {
  /**
   * GET /api/<version>/config/mobile
   * Mobile app fetches its configuration
   */
  async getMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      // Load from both namespaces, merge before returning
      const hookConfig = await this.loadHookSettings();
      const appConfig = await this.loadAppSettings();

      const mergedConfig: MobileConfigResponse = {
        ...hookConfig,
        ...appConfig,
      };
      return this.createSuccessResponse(mergedConfig);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to fetch mobile configuration', 500);
    }
  }

  /**
   * Load hook-related settings (analytics, error reporting, performance)
   */
  private async loadHookSettings(): Promise<MobileHooksConfigResponse> {
    const settings = await AppSetting.findAll({
      where: { key: { [Op.like]: `${BASE_HOOKS}.%` } },
    });
    const map = new Map(settings.map(s => [s.key, s.value]));
    // Default hook values
    const hooksDefaults = {
      analyticsEnabled: true,
      errorReportingEnabled: true,
      performanceMonitoringEnabled: true,
      emergencyEnabled: false,
      emergencyReason: null as string | null,
    };

    return {
      analyticsEnabled: this.parseBoolean(map.get(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED), hooksDefaults.analyticsEnabled),
      errorReportingEnabled: this.parseBoolean(map.get(MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED), hooksDefaults.errorReportingEnabled),
      performanceMonitoringEnabled: this.parseBoolean(map.get(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED), hooksDefaults.performanceMonitoringEnabled),
      emergencyEnabled: this.parseBoolean(map.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED), hooksDefaults.emergencyEnabled),
      emergencyReason: map.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON) || hooksDefaults.emergencyReason,
    };
  }

  /**
   * Load app-related settings (offline storage, batch intervals, limits)
   */
  private async loadAppSettings(): Promise<MobileAppConfigResponse> {
    const settings = await AppSetting.findAll({
      where: { key: { [Op.like]: `mobile.app.%` } },
    });
    const map = new Map(settings.map(s => [s.key, s.value]));

    // Default app values
    const appDefaults = {
      offlineStorageEnabled: true,
      batchUploadInterval: 300,
      maxOfflineEvents: 1000,
    };

    return {
      offlineStorageEnabled: this.parseBoolean(map.get(MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED), appDefaults.offlineStorageEnabled),
      batchUploadInterval: this.parseNumber(map.get(MOBILE_APP_SETTING_KEYS.BATCH_UPLOAD_INTERVAL), appDefaults.batchUploadInterval),
      maxOfflineEvents: this.parseNumber(map.get(MOBILE_APP_SETTING_KEYS.MAX_OFFLINE_EVENTS), appDefaults.maxOfflineEvents),
    };
  }
}

export const mobileConfigController = new MobileConfigController();
