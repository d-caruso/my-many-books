// ================================================================
// src/controllers/UserMobileConfigController.ts
// User-specific general mobile configuration endpoints
// ================================================================

import { UserBaseController } from '../base/UserBaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import {
  EmailNotificationFrequency,
  EMAIL_NOTIFICATION_FREQUENCY,
} from '@my-many-books/shared-types';
import {
  userMobileConfigService,
  type UserMobileConfigUpdateRequest,
} from '../../services/config/UserMobileConfigService';

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
      return this.createSuccessResponse(await userMobileConfigService.getUserMobileConfig(userId));
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
      return this.createSuccessResponse(
        await userMobileConfigService.updateUserMobileConfig(userId, body, request),
        'User mobile configuration updated successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }
}

export const userMobileConfigController = new UserMobileConfigController();
