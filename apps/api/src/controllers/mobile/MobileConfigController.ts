// ================================================================
// src/controllers/MobileConfigController.ts
// Mobile hook configuration endpoints (non-admin routes)
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingAttributes } from '../../models';
import { Op } from 'sequelize';

export interface MobileConfigResponse {
  hooks_enabled: boolean;
  analytics_enabled: boolean;
  error_reporting_enabled: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
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

export interface MobileConfigUpdateRequest {
  hooks_enabled?: boolean;
  analytics_enabled?: boolean;
  error_reporting_enabled?: boolean;
  log_level?: 'debug' | 'info' | 'warn' | 'error';
  batch_upload_interval?: number;
  max_offline_events?: number;
  hook_listeners?: {
    [key: string]: { enabled: boolean };
  };
  listener_categories?: {
    error_listeners?: { enabled: boolean };
    analytics_listeners?: { enabled: boolean };
    performance_listeners?: { enabled: boolean };
    user_behavior_listeners?: { enabled: boolean };
  };
}

export class MobileConfigController extends BaseController {
  /**
   * GET /api/config/mobile - Get mobile hook settings
   */
  async getMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
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
   * PUT /api/config/mobile - Update mobile hook settings
   */
  async updateMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody<MobileConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      // Update basic configuration
      if (typeof body.hooks_enabled === 'boolean') {
        await this.updateConfigSetting('mobile.hooks.enabled', String(body.hooks_enabled));
        updatedSettings.push('hooks_enabled');
      }

      if (typeof body.analytics_enabled === 'boolean') {
        await this.updateConfigSetting('mobile.hooks.analytics.enabled', String(body.analytics_enabled));
        updatedSettings.push('analytics_enabled');
      }

      if (typeof body.error_reporting_enabled === 'boolean') {
        await this.updateConfigSetting('mobile.hooks.errorReporting.enabled', String(body.error_reporting_enabled));
        updatedSettings.push('error_reporting_enabled');
      }

      if (body.log_level) {
        await this.updateConfigSetting('mobile.hooks.logLevel', body.log_level);
        updatedSettings.push('log_level');
      }

      if (typeof body.batch_upload_interval === 'number') {
        if (body.batch_upload_interval < 60 || body.batch_upload_interval > 3600) {
          return this.createErrorResponse('Batch upload interval must be between 60 and 3600 seconds', 400);
        }
        await this.updateConfigSetting('mobile.hooks.batchUploadInterval', String(body.batch_upload_interval));
        updatedSettings.push('batch_upload_interval');
      }

      if (typeof body.max_offline_events === 'number') {
        if (body.max_offline_events < 100 || body.max_offline_events > 10000) {
          return this.createErrorResponse('Max offline events must be between 100 and 10000', 400);
        }
        await this.updateConfigSetting('mobile.hooks.maxOfflineEvents', String(body.max_offline_events));
        updatedSettings.push('max_offline_events');
      }

      // Update individual hook listeners
      if (body.hook_listeners) {
        for (const [hookName, config] of Object.entries(body.hook_listeners)) {
          const key = `mobile.hooks.listeners.${hookName}.enabled`;
          await this.updateConfigSetting(key, String(config.enabled));
          updatedSettings.push(`hook_listeners.${hookName}`);
        }
      }

      // Update listener categories
      if (body.listener_categories) {
        for (const [categoryName, config] of Object.entries(body.listener_categories)) {
          const key = `mobile.hooks.categories.${categoryName}.enabled`;
          await this.updateConfigSetting(key, String(config.enabled));
          updatedSettings.push(`listener_categories.${categoryName}`);
        }
      }

      const newConfig = await this.loadMobileConfig();

      return this.createSuccessResponse({
        config: newConfig,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      }, 'Mobile configuration updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to update mobile configuration', 500);
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
      analytics_enabled: true,
      error_reporting_enabled: true,
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
      hooks_enabled: this.parseBoolean(settingsMap.get('mobile.hooks.enabled'), defaults.hooks_enabled),
      analytics_enabled: this.parseBoolean(settingsMap.get('mobile.hooks.analytics.enabled'), defaults.analytics_enabled),
      error_reporting_enabled: this.parseBoolean(settingsMap.get('mobile.hooks.errorReporting.enabled'), defaults.error_reporting_enabled),
      log_level: (settingsMap.get('mobile.hooks.logLevel') || defaults.log_level) as 'debug' | 'info' | 'warn' | 'error',
      batch_upload_interval: this.parseNumber(settingsMap.get('mobile.hooks.batchUploadInterval'), defaults.batch_upload_interval),
      max_offline_events: this.parseNumber(settingsMap.get('mobile.hooks.maxOfflineEvents'), defaults.max_offline_events),
      hook_listeners: hookListeners,
      listener_categories: listenerCategories,
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
        description: `Mobile hook configuration: ${key}`,
        deleted: false,
      } as AppSettingAttributes,
    });

    if (setting.value !== value) {
      await setting.update({ value });
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
}

export const mobileConfigController = new MobileConfigController();