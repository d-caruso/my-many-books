// ================================================================
// src/controllers/MobileConfigController.ts
// Mobile hook configuration endpoints (non-admin routes)
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { MOBILE_HOOKS } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

export interface MobileConfigResponse {
  hooks_enabled: boolean;
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  batch_upload_interval: number;
  max_offline_events: number;
  hook_listeners: {
    [key: string]: { enabled: boolean };
  };
  listener_categories: {
    error_listeners: { enabled: boolean };
    analytics_listeners: { enabled: boolean };
    performance_listeners: { enabled: boolean };
    user_behavior_listeners: { enabled: boolean };
  };
}

export class MobileConfigController extends BaseController {
  /**
   * GET /api/config/mobile - Get mobile hook settings
   */
  async getListenerSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const config = await this.loadMobileConfig();
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
  private async loadMobileConfig(): Promise<MobileConfigResponse> {
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
      hooks_enabled: true,
      analyticsEnabled: true,
      errorReportingEnabled: true,
      log_level: 'info' as const,
      batch_upload_interval: 300,
      max_offline_events: 1000,
    };

    // Load hook listeners configuration
    const hookListeners: { [key: string]: { enabled: boolean } } = {};
    const hookListenerKeys = settings.filter(s => s.key.includes('mobile.hooks.listeners.'));
    for (const setting of hookListenerKeys) {
      const hookName = setting.key.replace('mobile.hooks.listeners.', '').replace('.enabled', '');
      hookListeners[hookName] = { enabled: this.parseBoolean(setting.value, true) };
    }

    // Default hook listeners if none configured
    if (Object.keys(hookListeners).length === 0) {
      hookListeners['error.unhandled'] = { enabled: true };
      hookListeners['error.promise_rejection'] = { enabled: true };
      hookListeners['app.startup'] = { enabled: true };
      hookListeners['app.termination'] = { enabled: true };
      hookListeners['network.offline'] = { enabled: true };
      hookListeners['network.online'] = { enabled: true };
      hookListeners['sync.complete'] = { enabled: true };
      hookListeners['sync.failed'] = { enabled: false };
    }

    // Load listener categories configuration
    const listenerCategories = {
      error_listeners: { 
        enabled: this.parseBoolean(settingsMap.get('mobile.hooks.categories.error_listeners.enabled'), true) 
      },
      analytics_listeners: { 
        enabled: this.parseBoolean(settingsMap.get('mobile.hooks.categories.analytics_listeners.enabled'), true) 
      },
      performance_listeners: { 
        enabled: this.parseBoolean(settingsMap.get('mobile.hooks.categories.performance_listeners.enabled'), true) 
      },
      user_behavior_listeners: { 
        enabled: this.parseBoolean(settingsMap.get('mobile.hooks.categories.user_behavior_listeners.enabled'), true) 
      },
    };

    return {
      hooks_enabled: this.parseBoolean(settingsMap.get(MOBILE_HOOKS.ENABLED), defaults.hooks_enabled),
      analyticsEnabled: this.parseBoolean(settingsMap.get(MOBILE_HOOKS.ANALYTICS_ENABLED), defaults.analyticsEnabled),
      errorReportingEnabled: this.parseBoolean(settingsMap.get(MOBILE_HOOKS.ERROR_REPORTING_ENABLED), defaults.errorReportingEnabled),
      batch_upload_interval: this.parseNumber(settingsMap.get(MOBILE_HOOKS.BATCH_UPLOAD_INTERVAL), defaults.batch_upload_interval),
      max_offline_events: this.parseNumber(settingsMap.get('mobile.hooks.maxOfflineEvents'), defaults.max_offline_events),
      hook_listeners: hookListeners,
      listener_categories: listenerCategories,
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