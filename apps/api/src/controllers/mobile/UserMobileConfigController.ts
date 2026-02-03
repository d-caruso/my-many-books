// ================================================================
// src/controllers/UserMobileConfigController.ts
// User-specific general mobile configuration endpoints
// ================================================================

import { UserBaseController } from '../base/UserBaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingAttributes } from '../../models';
import { BASE_USER_PREFIX, USER_MOBILE_APP_SETTING_SUFFIXES, EmailNotificationFrequency } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

interface UserMobileConfigResponse {
  userId: number;
  offlineStorageEnabled: boolean;
  notificationPreferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailFrequency: EmailNotificationFrequency;
  };
  privacySettings: {
    dataCollectionEnabled: boolean;
    analyticsSharingEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  lastUpdated: string | null;
}

export interface UserMobileConfigUpdateRequest {
  offlineStorageEnabled?: boolean;
  notificationPreferences?: {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    smsEnabled?: boolean;
    emailFrequency?: EmailNotificationFrequency;
  };
  privacySettings?: {
    dataCollectionEnabled?: boolean;
    analyticsSharingEnabled?: boolean;
    crashReportingEnabled?: boolean;
  };
}

export class UserMobileConfigController extends UserBaseController {
  /**
   * GET /api/users/{id}/mobile-config - Get user's mobile config
   */
  async getUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can access this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

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
   * PUT /api/users/{id}/mobile-config - Update user's mobile config
   */
  async updateUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    const body = this.parseBody<UserMobileConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      if (typeof body.offlineStorageEnabled === 'boolean') {
        await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED, String(body.offlineStorageEnabled));
        updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED);
      }

      // Update notification preferences
      if (body.notificationPreferences) {
        if (typeof body.notificationPreferences.emailEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED, String(body.notificationPreferences.emailEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED);
        }
        if (typeof body.notificationPreferences.pushEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED, String(body.notificationPreferences.pushEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED);
        }
        if (typeof body.notificationPreferences.smsEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED, String(body.notificationPreferences.smsEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED);
        }
        if (body.notificationPreferences.emailFrequency) {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY, String(body.notificationPreferences.emailFrequency));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY);
        }
      }

      // Update privacy settings
      if (body.privacySettings) {
        if (typeof body.privacySettings.dataCollectionEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED, String(body.privacySettings.dataCollectionEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED);
        }
        if (typeof body.privacySettings.analyticsSharingEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED, String(body.privacySettings.analyticsSharingEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED);
        }
        if (typeof body.privacySettings.crashReportingEnabled === 'boolean') {
          await this.updateUserConfigSetting(userId, USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED, String(body.privacySettings.crashReportingEnabled));
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED);
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
  private async loadUserMobileConfig(userId: number): Promise<UserMobileConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: `${BASE_USER_PREFIX}.${userId}.%`
        },
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Helper function to get user setting with fallback to default
    const getUserSetting = (settingName: string, defaultValue: string | boolean | number): string | boolean | number => {
      const key = `${BASE_USER_PREFIX}.${userId}.${settingName}`;
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
          [Op.like]: `${BASE_USER_PREFIX}.${userId}.%`
        },
      },
      order: [['updateDate', 'DESC']],
    });

    return {
      userId: userId,
      offlineStorageEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED, true) as boolean,
      notificationPreferences: {
        emailEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED, true) as boolean,
        pushEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED, true) as boolean,
        smsEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED, false) as boolean,
        emailFrequency: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY, 'immediate') as EmailNotificationFrequency,
      },
      privacySettings: {
        dataCollectionEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED, true) as boolean,
        analyticsSharingEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED, true) as boolean,
        crashReportingEnabled: getUserSetting(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED, true) as boolean,
      },
      lastUpdated: lastUpdatedSetting?.updateDate?.toISOString() || null,
    };
  }

  /**
   * Update a user-specific configuration setting
   */
  private async updateUserConfigSetting(userId: number, settingName: string, value: string): Promise<void> {
    const key = `${BASE_USER_PREFIX}.${userId}.${settingName}`;
    
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
}

export const userMobileConfigController = new UserMobileConfigController();