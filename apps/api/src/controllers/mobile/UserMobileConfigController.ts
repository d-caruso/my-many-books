// ================================================================
// src/controllers/UserMobileConfigController.ts
// User-specific mobile hook configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingAttributes } from '../../models';
import { Op } from 'sequelize';

export interface UserMobileConfigResponse {
  user_id: string;
  hooks_enabled: boolean;
  analytics_enabled: boolean;
  error_reporting_enabled: boolean;
  performance_monitoring_enabled: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  notification_preferences: {
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  };
  privacy_settings: {
    data_collection_enabled: boolean;
    analytics_sharing_enabled: boolean;
    crash_reporting_enabled: boolean;
  };
  custom_hook_listeners: {
    [key: string]: { enabled: boolean };
  };
  last_updated: string | null;
}

export interface UserMobileConfigUpdateRequest {
  hooks_enabled?: boolean;
  analytics_enabled?: boolean;
  error_reporting_enabled?: boolean;
  performance_monitoring_enabled?: boolean;
  log_level?: 'debug' | 'info' | 'warn' | 'error';
  notification_preferences?: {
    email_enabled?: boolean;
    push_enabled?: boolean;
    sms_enabled?: boolean;
    email_frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  };
  privacy_settings?: {
    data_collection_enabled?: boolean;
    analytics_sharing_enabled?: boolean;
    crash_reporting_enabled?: boolean;
  };
  custom_hook_listeners?: {
    [key: string]: { enabled: boolean };
  };
}

export class UserMobileConfigController extends BaseController {
  /**
   * GET /api/users/{id}/mobile-config - Get user's mobile hook config
   */
  async getUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = request.params?.['id'];
    if (!userId) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can access this config (self or admin)
    const accessError = this.checkUserAccess(request, userId);
    if (accessError) return accessError;

    try {
      const config = await this.loadUserMobileConfig(userId);
      return this.createSuccessResponse(config);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to fetch user mobile configuration', 500);
    }
  }

  /**
   * PUT /api/users/{id}/mobile-config - Update user's mobile hook config
   */
  async updateUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = request.params?.['id'];
    if (!userId) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    const accessError = this.checkUserAccess(request, userId);
    if (accessError) return accessError;

    const body = this.parseBody<UserMobileConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      // Update basic hook settings
      if (typeof body.hooks_enabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'hooks_enabled', String(body.hooks_enabled));
        updatedSettings.push('hooks_enabled');
      }

      if (typeof body.analytics_enabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'analytics_enabled', String(body.analytics_enabled));
        updatedSettings.push('analytics_enabled');
      }

      if (typeof body.error_reporting_enabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'error_reporting_enabled', String(body.error_reporting_enabled));
        updatedSettings.push('error_reporting_enabled');
      }

      if (typeof body.performance_monitoring_enabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'performance_monitoring_enabled', String(body.performance_monitoring_enabled));
        updatedSettings.push('performance_monitoring_enabled');
      }

      if (body.log_level) {
        await this.updateUserConfigSetting(userId, 'log_level', body.log_level);
        updatedSettings.push('log_level');
      }

      // Update notification preferences
      if (body.notification_preferences) {
        for (const [key, value] of Object.entries(body.notification_preferences)) {
          await this.updateUserConfigSetting(userId, `notification_preferences.${key}`, String(value));
          updatedSettings.push(`notification_preferences.${key}`);
        }
      }

      // Update privacy settings
      if (body.privacy_settings) {
        for (const [key, value] of Object.entries(body.privacy_settings)) {
          await this.updateUserConfigSetting(userId, `privacy_settings.${key}`, String(value));
          updatedSettings.push(`privacy_settings.${key}`);
        }
      }

      // Update custom hook listeners
      if (body.custom_hook_listeners) {
        for (const [hookName, config] of Object.entries(body.custom_hook_listeners)) {
          await this.updateUserConfigSetting(userId, `custom_hook_listeners.${hookName}.enabled`, String(config.enabled));
          updatedSettings.push(`custom_hook_listeners.${hookName}`);
        }
      }

      const newConfig = await this.loadUserMobileConfig(userId);

      return this.createSuccessResponse({
        config: newConfig,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      }, 'User mobile configuration updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to update user mobile configuration', 500);
    }
  }

  /**
   * Load user-specific mobile configuration from database
   */
  private async loadUserMobileConfig(userId: string): Promise<UserMobileConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: `user.${userId}.mobile.%`
        },
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Helper function to get user setting with fallback to default
    const getUserSetting = (settingName: string, defaultValue: string | boolean | number): string | boolean | number => {
      const key = `user.${userId}.mobile.${settingName}`;
      const value = settingsMap.get(key);
      if (value === undefined) return defaultValue;
      if (typeof defaultValue === 'boolean') {
        return value === 'true';
      }
      if (typeof defaultValue === 'number') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
      }
      return value;
    };

    // Load custom hook listeners
    const customHookListeners: { [key: string]: { enabled: boolean } } = {};
    const customHookKeys = settings.filter(s => s.key.includes(`user.${userId}.mobile.custom_hook_listeners.`));
    for (const setting of customHookKeys) {
      const hookName = setting.key.replace(`user.${userId}.mobile.custom_hook_listeners.`, '').replace('.enabled', '');
      customHookListeners[hookName] = { enabled: this.parseBoolean(setting.value, true) };
    }

    // Find last updated timestamp
    const lastUpdatedSetting = await AppSetting.findOne({
      where: {
        key: {
          [Op.like]: `user.${userId}.mobile.%`
        },
      },
      order: [['updateDate', 'DESC']],
    });

    return {
      user_id: userId,
      hooks_enabled: getUserSetting('hooks_enabled', true) as boolean,
      analytics_enabled: getUserSetting('analytics_enabled', true) as boolean,
      error_reporting_enabled: getUserSetting('error_reporting_enabled', true) as boolean,
      performance_monitoring_enabled: getUserSetting('performance_monitoring_enabled', true) as boolean,
      log_level: (getUserSetting('log_level', 'info') as string) as 'debug' | 'info' | 'warn' | 'error',
      notification_preferences: {
        email_enabled: getUserSetting('notification_preferences.email_enabled', true) as boolean,
        push_enabled: getUserSetting('notification_preferences.push_enabled', true) as boolean,
        sms_enabled: getUserSetting('notification_preferences.sms_enabled', false) as boolean,
        email_frequency: (getUserSetting('notification_preferences.email_frequency', 'immediate') as string) as 'immediate' | 'daily' | 'weekly' | 'never',
      },
      privacy_settings: {
        data_collection_enabled: getUserSetting('privacy_settings.data_collection_enabled', true) as boolean,
        analytics_sharing_enabled: getUserSetting('privacy_settings.analytics_sharing_enabled', true) as boolean,
        crash_reporting_enabled: getUserSetting('privacy_settings.crash_reporting_enabled', true) as boolean,
      },
      custom_hook_listeners: customHookListeners,
      last_updated: lastUpdatedSetting?.updateDate?.toISOString() || null,
    };
  }

  /**
   * Update a user-specific configuration setting
   */
  private async updateUserConfigSetting(userId: string, settingName: string, value: string): Promise<void> {
    const key = `user.${userId}.mobile.${settingName}`;
    
    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value,
        active: true,
        category: 'user_mobile_config',
        type: 'string',
        defaultValue: value,
        description: `User ${userId} mobile configuration: ${settingName}`,
        deleted: false,
      } as AppSettingAttributes,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }

  /**
   * Check if user has access to view/update this configuration
   */
  private checkUserAccess(request: UniversalRequest, targetUserId: string): ApiResponse | null {
    const currentUserId = request.user?.id;
    
    // Must be logged in
    if (!currentUserId) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    
    // User can access their own config
    if (String(currentUserId) === targetUserId) {
      return null;
    }
    
    // Admin users can access any config (simplified check - in real app, check proper roles)
    if (request.user?.isAdmin) {
      return null;
    }
    
    // No access
    return this.createErrorResponseI18n('errors:access_denied', 403);
  }

  /**
   * Parse boolean value from string
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value === 'true';
  }
}

export const userMobileConfigController = new UserMobileConfigController();