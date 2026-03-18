// ================================================================
// src/controllers/UserMobileConfigController.ts
// User-specific general mobile configuration endpoints
// ================================================================

import { UserBaseController } from '../base/UserBaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingCreationAttributes } from '../../models';
import {
  BASE_USER_PREFIX,
  USER_MOBILE_APP_SETTING_SUFFIXES,
  EmailNotificationFrequency,
  EMAIL_NOTIFICATION_FREQUENCY,
} from '@my-many-books/shared-types';
import { Op } from 'sequelize';
import { controlPlaneHookService } from '../../services/hooks/ControlPlaneHookService';
import { EVENTS } from '../../services/hooks/events';

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

const isEmailNotificationFrequency = (value: unknown): value is EmailNotificationFrequency =>
  value === EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE ||
  value === EMAIL_NOTIFICATION_FREQUENCY.DAILY ||
  value === EMAIL_NOTIFICATION_FREQUENCY.WEEKLY ||
  value === EMAIL_NOTIFICATION_FREQUENCY.NEVER;

export class UserMobileConfigController extends UserBaseController {
  private isUserMobileConfigUpdateRequest(value: unknown): value is UserMobileConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    const notificationPreferences = value['notificationPreferences'];
    if (notificationPreferences !== undefined) {
      if (!this.isRecord(notificationPreferences)) {
        return false;
      }

      if (
        notificationPreferences['emailEnabled'] !== undefined &&
        typeof notificationPreferences['emailEnabled'] !== 'boolean'
      ) {
        return false;
      }
      if (
        notificationPreferences['pushEnabled'] !== undefined &&
        typeof notificationPreferences['pushEnabled'] !== 'boolean'
      ) {
        return false;
      }
      if (
        notificationPreferences['smsEnabled'] !== undefined &&
        typeof notificationPreferences['smsEnabled'] !== 'boolean'
      ) {
        return false;
      }
      if (
        notificationPreferences['emailFrequency'] !== undefined &&
        !isEmailNotificationFrequency(notificationPreferences['emailFrequency'])
      ) {
        return false;
      }
    }

    const privacySettings = value['privacySettings'];
    if (privacySettings !== undefined) {
      if (!this.isRecord(privacySettings)) {
        return false;
      }

      if (
        privacySettings['dataCollectionEnabled'] !== undefined &&
        typeof privacySettings['dataCollectionEnabled'] !== 'boolean'
      ) {
        return false;
      }
      if (
        privacySettings['analyticsSharingEnabled'] !== undefined &&
        typeof privacySettings['analyticsSharingEnabled'] !== 'boolean'
      ) {
        return false;
      }
      if (
        privacySettings['crashReportingEnabled'] !== undefined &&
        typeof privacySettings['crashReportingEnabled'] !== 'boolean'
      ) {
        return false;
      }
    }

    return (
      value['offlineStorageEnabled'] === undefined ||
      typeof value['offlineStorageEnabled'] === 'boolean'
    );
  }

  private normalizeEmailFrequency(value: string): EmailNotificationFrequency {
    if (isEmailNotificationFrequency(value)) {
      return value;
    }
    return EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE;
  }

  /**
   * GET /api/users/{id}/mobile-config - Get user's mobile config
   */
  async getUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'user' });
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
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * PUT /api/users/{id}/mobile-config - Update user's mobile config
   */
  async updateUserMobileConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'user' });
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    const body = this.parseBody(request);
    if (!this.isUserMobileConfigUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];
      const actor = controlPlaneHookService.getActorContext(request.user);
      const previousConfig = await this.loadUserMobileConfig(userId);

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'BEFORE',
        {
          actor,
          userId,
          previousConfig,
          changes: body,
        }
      );

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

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'AFTER',
        {
          actor,
          userId,
          previousConfig,
          config: newConfig,
          updated: updatedSettings,
        }
      );

      return this.createSuccessResponse({
        config: newConfig,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      }, 'User mobile configuration updated successfully');
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'FAILURE',
        {
          actor: controlPlaneHookService.getActorContext(request.user),
          userId,
          changes: body,
          error,
        }
      );
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
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

    const getUserSetting = (settingName: string, defaultValue: string): string => {
      const key = `${BASE_USER_PREFIX}.${userId}.${settingName}`;
      const value = settingsMap.get(key);
      return value === undefined ? defaultValue : value;
    };

    const getUserBooleanSetting = (settingName: string, defaultValue: boolean): boolean => {
      const key = `${BASE_USER_PREFIX}.${userId}.${settingName}`;
      const value = settingsMap.get(key);
      if (value === undefined) return defaultValue;
      return value === 'true';
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
      offlineStorageEnabled: getUserBooleanSetting(
        USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED,
        true
      ),
      notificationPreferences: {
        emailEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED,
          true
        ),
        pushEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED,
          true
        ),
        smsEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED,
          false
        ),
        emailFrequency: this.normalizeEmailFrequency(
          getUserSetting(
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY,
            EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE
          )
        ),
      },
      privacySettings: {
        dataCollectionEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED,
          true
        ),
        analyticsSharingEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED,
          true
        ),
        crashReportingEnabled: getUserBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED,
          true
        ),
      },
      lastUpdated: lastUpdatedSetting?.updateDate?.toISOString() || null,
    };
  }

  /**
   * Update a user-specific configuration setting
   */
  private async updateUserConfigSetting(userId: number, settingName: string, value: string): Promise<void> {
    const key = `${BASE_USER_PREFIX}.${userId}.${settingName}`;
    
    const defaults: AppSettingCreationAttributes = {
      key,
      value,
      active: true,
      category: 'user_mobile_config',
      type: 'string',
      defaultValue: value,
      description: `User ${userId} mobile configuration: ${settingName}`,
      deleted: false,
    };

    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }
}

export const userMobileConfigController = new UserMobileConfigController();
