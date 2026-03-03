// ================================================================
// src/controllers/UserMobileHooksSettingsController.ts
// User-specific mobile hook settings endpoints (overrides admin defaults)
// ================================================================

import { UserBaseController } from '../base/UserBaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting, AppSettingCreationAttributes } from '../../models';
import { BASE_USER_PREFIX } from '@my-many-books/shared-types';
import { Op } from 'sequelize';

interface UserMobileConfigResponse {
  userId: number;
  analyticsEnabled: boolean;
  lastUpdated: string | null;
}

export interface UserMobileConfigUpdateRequest {
  analyticsEnabled?: boolean;
}

export class UserMobileHooksSettingsController extends UserBaseController {
  private isUserMobileHooksUpdateRequest(value: unknown): value is UserMobileConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    return value['analyticsEnabled'] === undefined || typeof value['analyticsEnabled'] === 'boolean';
  }

  /**
   * GET /api/users/{id}/mobile-hooks/settings - Get user's mobile hooks settings
   */
  async getSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
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
   * PUT /api/users/{id}/mobile-hooks/settings - Update user's mobile hooks settings
   */
  async updateSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const userId = this.getIdParam(request);
    if (userId === null) {
      return this.createErrorResponse('User ID is required', 400);
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    const body = this.parseBody(request);
    if (!this.isUserMobileHooksUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      // Update basic hook settings
      
      if (typeof body.analyticsEnabled === 'boolean') {
        await this.updateUserConfigSetting(userId, 'analytics_enabled', String(body.analyticsEnabled));
        updatedSettings.push('analytics_enabled');
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
      analyticsEnabled: getUserBooleanSetting('analytics_enabled', true),
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

export const userMobileHooksSettingsController = new UserMobileHooksSettingsController();
