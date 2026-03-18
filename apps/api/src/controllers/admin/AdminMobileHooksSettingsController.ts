// ================================================================
// src/controllers/admin/AdminMobileHooksSettingsController.ts
// Mobile hook settings management controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { type MobileHooksListenerSettings } from '@my-many-books/shared-types';
import { mobileHooksConfigService } from '../../services/config/MobileHooksConfigService';
import { DEFAULT_LISTENER_SETTINGS } from '../../services/config/mobileHooksConfigStore';

export interface EmergencyStatusRequest {
  enabled: boolean;
  reason?: string;
}

const MOBILE_HOOKS_SETTINGS_MESSAGES = {
  SUCCESS: {
    UPDATED: 'Mobile hooks settings updated successfully',
    RESET: 'Mobile hooks settings reset to defaults successfully',
  },
} as const;

const MOBILE_HOOKS_SETTINGS_SCHEMA = {
  properties: {
    analyticsEnabled: {
      type: 'boolean',
      description: 'Enable analytics event tracking',
      default: true,
    },
    errorReportingEnabled: {
      type: 'boolean',
      description: 'Enable error and crash reporting',
      default: true,
    },
    performanceMonitoringEnabled: {
      type: 'boolean',
      description: 'Enable performance monitoring',
      default: true,
    },
  },
  required: [],
  defaults: DEFAULT_LISTENER_SETTINGS,
} as const;

export class AdminMobileHooksSettingsController extends BaseController {
  private isListenerSettingsUpdate(value: unknown): value is Partial<MobileHooksListenerSettings> {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      (value['analyticsEnabled'] === undefined || typeof value['analyticsEnabled'] === 'boolean') &&
      (value['errorReportingEnabled'] === undefined ||
        typeof value['errorReportingEnabled'] === 'boolean') &&
      (value['performanceMonitoringEnabled'] === undefined ||
        typeof value['performanceMonitoringEnabled'] === 'boolean')
    );
  }

  private isEmergencyStatusRequest(value: unknown): value is EmergencyStatusRequest {
    if (!this.isRecord(value) || typeof value['enabled'] !== 'boolean') {
      return false;
    }

    return value['reason'] === undefined || typeof value['reason'] === 'string';
  }

  async getListenerSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.getListenerSettings());
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async updateListenerSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isListenerSettingsUpdate(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.updateListenerSettings(body, request),
        MOBILE_HOOKS_SETTINGS_MESSAGES.SUCCESS.UPDATED
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async resetMobileSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.resetMobileSettings(request),
        MOBILE_HOOKS_SETTINGS_MESSAGES.SUCCESS.RESET
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async getMobileSettingsSchema(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    return this.createSuccessResponse({
      schema: MOBILE_HOOKS_SETTINGS_SCHEMA,
      version: '1.0.0',
    });
  }

  async getEmergencyStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.getEmergencyStatus());
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async updateEmergencyStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isEmergencyStatusRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.updateEmergencyStatus(body, request)
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async getHealth(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.getHealth());
    } catch (error) {
      return this.createSuccessResponse({
        status: 'error',
        healthScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const adminMobileHooksSettingsController = new AdminMobileHooksSettingsController();
