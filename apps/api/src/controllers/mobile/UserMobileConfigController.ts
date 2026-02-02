// ================================================================
// src/controllers/UserMobileConfigController.ts
// User-specific general mobile configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingAttributes } from '../../models';
import { MOBILE_APP_SETTING_KEYS } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

interface UserMobileConfigResponse {
  userId: string;
  analyticsEnabled: boolean;
  offlineStorageEnabled: boolean;
  notificationPreferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailFrequency: 'immediate' | 'daily' | 'weekly' | 'never';
  };
  privacySettings: {
    dataCollectionEnabled: boolean;
    analyticsSharingEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  lastUpdated: string | null;
}

export interface UserMobileConfigUpdateRequest {
  analyticsEnabled?: boolean;
  offlineStorageEnabled?: boolean;
  notificationPreferences?: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    emailFrequency?: 'immediate' | 'daily' | 'weekly' | 'never';
  };
  privacySettings?: {
    dataCollectionEnabled?: boolean;
    analyticsSharingEnabled?: boolean;
    crashReportingEnabled?: boolean;
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
      
      if (typeof body.analyticsEnabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'analytics_enabled', String(body.analyticsEnabled));
        updatedSettings.push('analytics_enabled');
      }

      if (typeof body.offlineStorageEnabled === 'boolean') {
        await this.updateUserConfigSetting(userId, MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED, String(body.offlineStorageEnabled));
        updatedSettings.push(MOBILE_APP_SETTING_KEYS.OFFLINE_STORAGE_ENABLED);
      }

      // Update notification preferences
      if (body.notificationPreferences) {
        for (const [key, value] of Object.entries(body.notificationPreferences)) {
          await this.updateUserConfigSetting(userId, `notification_preferences.${key}`, String(value));
          updatedSettings.push(`notification_preferences.${key}`);
        }
      }

      // Update privacy settings
      if (body.privacySettings) {
        for (const [key, value] of Object.entries(body.privacySettings)) {
          await this.updateUserConfigSetting(userId, `privacy_settings.${key}`, String(value));
          updatedSettings.push(`privacy_settings.${key}`);
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
      userId: userId,
      analyticsEnabled: getUserSetting('analytics_enabled', true) as boolean,
      offlineStorageEnabled: getUserSetting('offline_storage.enabled', true) as boolean,
      notificationPreferences: {
        emailEnabled: getUserSetting('notification_preferences.email_enabled', true) as boolean,
        pushEnabled: getUserSetting('notification_preferences.push_enabled', true) as boolean,
        smsEnabled: getUserSetting('notification_preferences.sms_enabled', false) as boolean,
        emailFrequency: (getUserSetting('notification_preferences.email_frequency', 'immediate') as string) as 'immediate' | 'daily' | 'weekly' | 'never',
      },
      privacySettings: {
        dataCollectionEnabled: getUserSetting('privacy_settings.data_collection_enabled', true) as boolean,
        analyticsSharingEnabled: getUserSetting('privacy_settings.analytics_sharing_enabled', true) as boolean,
        crashReportingEnabled: getUserSetting('privacy_settings.crash_reporting_enabled', true) as boolean,
      },
      lastUpdated: lastUpdatedSetting?.updateDate?.toISOString() || null,
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
}

export const userMobileConfigController = new UserMobileConfigController();