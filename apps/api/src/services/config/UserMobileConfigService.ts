import {
  BASE_USER_PREFIX,
  EMAIL_NOTIFICATION_FREQUENCY,
  type EmailNotificationFrequency,
  USER_MOBILE_APP_SETTING_SUFFIXES,
} from '@my-many-books/shared-types';
import { Op } from 'sequelize';
import { AppSetting } from '../../models';
import type { UniversalRequest } from '../../types';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import { upsertAppSetting } from './appSettingStore';

const USER_MOBILE_HOOK_ANALYTICS_KEY = 'analytics_enabled';

export interface UserMobileConfigResponse {
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

export interface UserMobileHooksSettingsResponse {
  userId: number;
  analyticsEnabled: boolean;
  lastUpdated: string | null;
}

export interface UserMobileHooksSettingsUpdateRequest {
  analyticsEnabled?: boolean;
}

class UserMobileConfigService {
  async getUserMobileConfig(userId: number): Promise<UserMobileConfigResponse> {
    const settingsMap = await this.loadUserSettingsMap(userId);
    const lastUpdated = await this.getLastUpdated(userId);

    const getSetting = (settingName: string, defaultValue: string): string => {
      const value = settingsMap.get(this.getUserSettingKey(userId, settingName));
      return value === undefined ? defaultValue : value;
    };

    const getBooleanSetting = (settingName: string, defaultValue: boolean): boolean => {
      const value = settingsMap.get(this.getUserSettingKey(userId, settingName));
      return value === undefined ? defaultValue : value === 'true';
    };

    return {
      userId,
      offlineStorageEnabled: getBooleanSetting(
        USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED,
        true
      ),
      notificationPreferences: {
        emailEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED,
          true
        ),
        pushEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED,
          true
        ),
        smsEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED,
          false
        ),
        emailFrequency: this.normalizeEmailFrequency(
          getSetting(
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY,
            EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE
          )
        ),
      },
      privacySettings: {
        dataCollectionEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED,
          true
        ),
        analyticsSharingEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED,
          true
        ),
        crashReportingEnabled: getBooleanSetting(
          USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED,
          true
        ),
      },
      lastUpdated,
    };
  }

  async updateUserMobileConfig(
    userId: number,
    changes: UserMobileConfigUpdateRequest,
    request: UniversalRequest
  ): Promise<{ config: UserMobileConfigResponse; updated: string[]; lastUpdated: string }> {
    const updatedSettings: string[] = [];
    const actor = controlPlaneHookService.getActorContext(request.user);
    const previousConfig = await this.getUserMobileConfig(userId);

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'BEFORE',
        {
          actor,
          userId,
          previousConfig,
          changes,
        }
      );

      if (typeof changes.offlineStorageEnabled === 'boolean') {
        await this.saveUserSetting(
          userId,
          USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED,
          String(changes.offlineStorageEnabled)
        );
        updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.OFFLINE_STORAGE_ENABLED);
      }

      if (changes.notificationPreferences) {
        if (typeof changes.notificationPreferences.emailEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED,
            String(changes.notificationPreferences.emailEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_ENABLED);
        }

        if (typeof changes.notificationPreferences.pushEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED,
            String(changes.notificationPreferences.pushEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_PUSH_ENABLED);
        }

        if (typeof changes.notificationPreferences.smsEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED,
            String(changes.notificationPreferences.smsEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_SMS_ENABLED);
        }

        if (changes.notificationPreferences.emailFrequency) {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY,
            changes.notificationPreferences.emailFrequency
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.NOTIFICATION_EMAIL_FREQUENCY);
        }
      }

      if (changes.privacySettings) {
        if (typeof changes.privacySettings.dataCollectionEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED,
            String(changes.privacySettings.dataCollectionEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_DATA_COLLECTION_ENABLED);
        }

        if (typeof changes.privacySettings.analyticsSharingEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED,
            String(changes.privacySettings.analyticsSharingEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_ANALYTICS_SHARING_ENABLED);
        }

        if (typeof changes.privacySettings.crashReportingEnabled === 'boolean') {
          await this.saveUserSetting(
            userId,
            USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED,
            String(changes.privacySettings.crashReportingEnabled)
          );
          updatedSettings.push(USER_MOBILE_APP_SETTING_SUFFIXES.PRIVACY_CRASH_REPORTING_ENABLED);
        }
      }

      const config = await this.getUserMobileConfig(userId);

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'AFTER',
        {
          actor,
          userId,
          previousConfig,
          config,
          updated: updatedSettings,
        }
      );

      return {
        config,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.CONFIG.UPDATE,
        'FAILURE',
        {
          actor,
          userId,
          changes,
          error,
        }
      );
      throw error;
    }
  }

  async getUserMobileHooksSettings(userId: number): Promise<UserMobileHooksSettingsResponse> {
    const settingsMap = await this.loadUserSettingsMap(userId);
    const analyticsEnabled =
      settingsMap.get(this.getUserSettingKey(userId, USER_MOBILE_HOOK_ANALYTICS_KEY)) !== 'false';

    return {
      userId,
      analyticsEnabled,
      lastUpdated: await this.getLastUpdated(userId),
    };
  }

  async updateUserMobileHooksSettings(
    userId: number,
    changes: UserMobileHooksSettingsUpdateRequest,
    request: UniversalRequest
  ): Promise<{ config: UserMobileHooksSettingsResponse; updated: string[]; lastUpdated: string }> {
    const updatedSettings: string[] = [];
    const actor = controlPlaneHookService.getActorContext(request.user);
    const previousConfig = await this.getUserMobileHooksSettings(userId);

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.HOOKS.SETTINGS.UPDATE,
        'BEFORE',
        {
          actor,
          userId,
          previousConfig,
          changes,
        }
      );

      if (typeof changes.analyticsEnabled === 'boolean') {
        await this.saveUserSetting(
          userId,
          USER_MOBILE_HOOK_ANALYTICS_KEY,
          String(changes.analyticsEnabled)
        );
        updatedSettings.push(USER_MOBILE_HOOK_ANALYTICS_KEY);
      }

      const config = await this.getUserMobileHooksSettings(userId);

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.HOOKS.SETTINGS.UPDATE,
        'AFTER',
        {
          actor,
          userId,
          previousConfig,
          config,
          updated: updatedSettings,
        }
      );

      return {
        config,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.USER.MOBILE.HOOKS.SETTINGS.UPDATE,
        'FAILURE',
        {
          actor,
          userId,
          changes,
          error,
        }
      );
      throw error;
    }
  }

  private normalizeEmailFrequency(value: string): EmailNotificationFrequency {
    switch (value) {
      case EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE:
      case EMAIL_NOTIFICATION_FREQUENCY.DAILY:
      case EMAIL_NOTIFICATION_FREQUENCY.WEEKLY:
      case EMAIL_NOTIFICATION_FREQUENCY.NEVER:
        return value;
      default:
        return EMAIL_NOTIFICATION_FREQUENCY.IMMEDIATE;
    }
  }

  private async loadUserSettingsMap(userId: number): Promise<Map<string, string>> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: `${BASE_USER_PREFIX}.${userId}.%`,
        },
      },
    });

    return new Map(settings.map(setting => [setting.key, setting.value]));
  }

  private async getLastUpdated(userId: number): Promise<string | null> {
    const lastUpdatedSetting = await AppSetting.findOne({
      where: {
        key: {
          [Op.like]: `${BASE_USER_PREFIX}.${userId}.%`,
        },
      },
      order: [['updateDate', 'DESC']],
    });

    return lastUpdatedSetting?.updateDate?.toISOString() ?? null;
  }

  private async saveUserSetting(userId: number, settingName: string, value: string): Promise<void> {
    await upsertAppSetting({
      key: this.getUserSettingKey(userId, settingName),
      value,
      category: 'user_mobile_config',
      type: 'string',
      description: `User ${userId} mobile configuration: ${settingName}`,
    });
  }

  private getUserSettingKey(userId: number, settingName: string): string {
    return `${BASE_USER_PREFIX}.${userId}.${settingName}`;
  }
}

export const userMobileConfigService = new UserMobileConfigService();
