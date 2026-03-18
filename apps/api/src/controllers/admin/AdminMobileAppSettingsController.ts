// ================================================================
// src/controllers/admin/AdminMobileAppSettingsController.ts
// Mobile App general settings management controller
// Manages global mobile app infrastructure settings—offline storage, batch intervals, and event limits
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { MobileAppSettings } from '@my-many-books/shared-types';
import {
  mobileAppSettingsService,
  MOBILE_APP_SETTINGS_SCHEMA,
} from '../../services/config/MobileAppSettingsService';

// settings messages
const MOBILE_APP_SETTINGS_MESSAGES = {
  SUCCESS: {
    UPDATED: 'Mobile settings updated successfully',
  },
} as const;

export class AdminMobileAppSettingsController extends BaseController {
  private isMobileAppSettingsUpdate(value: unknown): value is Partial<MobileAppSettings> {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      (value['offlineStorageEnabled'] === undefined ||
        typeof value['offlineStorageEnabled'] === 'boolean') &&
      (value['batchUploadInterval'] === undefined ||
        typeof value['batchUploadInterval'] === 'number') &&
      (value['maxOfflineEvents'] === undefined || typeof value['maxOfflineEvents'] === 'number')
    );
  }

    /**
    * GET /api/<version>/admin/mobile-app/settings
    * Get current mobile app global settings
    */
  async getSettings(request: UniversalRequest): Promise<ApiResponse> {
    // Load from mobile.app.global.* keys
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileAppSettingsService.getSettings());
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }
   /**
    * PUT /api/<version>/admin/mobile-app/settings
    * Update mobile app global settings
    */
   async updateSettings(request: UniversalRequest): Promise<ApiResponse> {
    // Validate batch interval (60-3600s) and max events (100-10000)
    // Save to mobile.app.global.* keys
    // Log audit event

    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isMobileAppSettingsUpdate(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
        return this.createSuccessResponse(
          await mobileAppSettingsService.updateSettings(body, request),
          MOBILE_APP_SETTINGS_MESSAGES.SUCCESS.UPDATED
        );
    } catch (error) {
        if (error instanceof Error && error.message === 'BATCH_UPLOAD_INTERVAL_INVALID') {
          return this.createErrorResponseI18n('errors:batch_upload_interval_invalid', 400, { min: 60, max: 3600 });
        }
        if (error instanceof Error && error.message === 'MAX_OFFLINE_EVENTS_INVALID') {
          return this.createErrorResponseI18n('errors:max_offline_events_invalid', 400, { min: 100, max: 10000 });
        }
        if (error instanceof Error) {
          return this.createErrorResponse(error.message, 500);
        }
        return this.createErrorResponseI18n('errors:internal_error', 500);
    }
   }

   /**
    * POST /api/<version>/admin/mobile-app/settings/reset
    * Reset mobile app settings to defaults
    */
   async resetSettings(request: UniversalRequest): Promise<ApiResponse> {
     // Reset to DEFAULT_MOBILE_APP_SETTINGS
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(
        await mobileAppSettingsService.resetSettings(request),
        'Mobile settings reset to defaults successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * Get mobile settings validation rules
   */
  async getMobileSettingsSchema(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    return this.createSuccessResponse({
      schema: MOBILE_APP_SETTINGS_SCHEMA,
      version: '1.0.0',
    });
  }
}

export const adminMobileAppSettingsController = new AdminMobileAppSettingsController();
