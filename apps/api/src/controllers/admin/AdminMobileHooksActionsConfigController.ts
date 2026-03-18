// ================================================================
// src/controllers/admin/AdminMobileHooksActionsConfigController.ts
// Admin hook action configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { isJsonObject } from '../../types/json';
import { mobileHooksConfigService } from '../../services/config/MobileHooksConfigService';
import {
  ACTION_TYPES,
  type ActionSettingsUpdateRequest,
  type ActionType,
  type HookActionConfigUpdateRequest,
  type HookActionMapping,
  type HookListenerUpdateRequest,
  type TestActionTypeRequestBody,
  type TestConfigRequestBody,
} from '../../services/config/MobileHooksConfig.types';

const ACTION_TYPE_VALUES = Object.values(ACTION_TYPES) as readonly string[];

export { ACTION_TYPES } from '../../services/config/MobileHooksConfig.types';

export class AdminMobileHooksActionsConfigController extends BaseController {
  private isActionType(value: string | undefined): value is ActionType {
    return typeof value === 'string' && ACTION_TYPE_VALUES.includes(value);
  }

  private isHookActionMapping(value: unknown): value is HookActionMapping {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every(
      actions =>
        Array.isArray(actions) &&
        actions.every(action => typeof action === 'string' && this.isActionType(action))
    );
  }

  private isHookActionConfigUpdateRequest(value: unknown): value is HookActionConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['actions'] !== undefined && !this.isHookActionMapping(value['actions'])) {
      return false;
    }

    if (value['actionSettings'] !== undefined && !this.isRecord(value['actionSettings'])) {
      return false;
    }

    return true;
  }

  private isHookListenerUpdateRequest(value: unknown): value is HookListenerUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['listeners'] !== undefined && !this.isRecord(value['listeners'])) {
      return false;
    }

    if (value['categories'] !== undefined && !this.isRecord(value['categories'])) {
      return false;
    }

    return (
      (value['analytics'] === undefined || typeof value['analytics'] === 'boolean') &&
      (value['errorReporting'] === undefined || typeof value['errorReporting'] === 'boolean') &&
      (value['offlineStorage'] === undefined || typeof value['offlineStorage'] === 'boolean') &&
      (value['performanceMonitoring'] === undefined ||
        typeof value['performanceMonitoring'] === 'boolean')
    );
  }

  private isTestConfigRequestBody(value: unknown): value is TestConfigRequestBody {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      (value['eventType'] === undefined || typeof value['eventType'] === 'string') &&
      (value['payload'] === undefined || isJsonObject(value['payload']))
    );
  }

  private isActionSettingsUpdateRequest(value: unknown): value is ActionSettingsUpdateRequest {
    return this.isRecord(value);
  }

  private isTestActionTypeRequestBody(value: unknown): value is TestActionTypeRequestBody {
    if (!this.isRecord(value) || typeof value['actionType'] !== 'string') {
      return false;
    }

    return (
      this.isActionType(value['actionType']) &&
      (value['dryRun'] === undefined || typeof value['dryRun'] === 'boolean') &&
      (value['testData'] === undefined || isJsonObject(value['testData']))
    );
  }

  async getActionMappings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.getActionMappings());
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async updateActionMappings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isHookActionConfigUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    if (body.actionSettings) {
      for (const [actionType, settings] of Object.entries(body.actionSettings)) {
        if (!this.isActionType(actionType) || !isJsonObject(settings)) {
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
      }
    }

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.updateActionMappings(body, request),
        'Hook action configuration updated successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async getHookListeners(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.getHookListeners());
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async updateHookActionListeners(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isHookListenerUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.updateHookActionListeners(body, request)
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_HOOK_TOGGLE') {
        return this.createErrorResponseI18n('errors:invalid_listener_toggle', 400);
      }
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async testConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const parsedBody = this.parseBody(request);
    if (parsedBody !== null && !this.isTestConfigRequestBody(parsedBody)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.testConfig(parsedBody, request));
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async getActionTypes(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    return this.createSuccessResponse(await mobileHooksConfigService.getActionTypes());
  }

  async updateActionTypeSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const actionType = request.params?.['action_type'];
    if (!this.isActionType(actionType)) {
      return this.createErrorResponseI18n('errors:invalid_action_type', 400);
    }

    const body = this.parseBody(request);
    if (!this.isActionSettingsUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await mobileHooksConfigService.updateActionTypeSettings(actionType, body, request),
        `${actionType} action settings updated successfully`
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_RATE_LIMIT_INVALID') {
        return this.createErrorResponseI18n('errors:email_rate_limit_invalid', 400, {
          min: 1,
          max: 1440,
        });
      }
      if (error instanceof Error && error.message === 'VALIDATION_FAILED') {
        return this.createErrorResponseI18n('errors:validation_failed', 400);
      }
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  async testActionType(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isTestActionTypeRequestBody(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(await mobileHooksConfigService.testActionType(body, request));
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }
}

export const adminMobileHooksActionsConfigController =
  new AdminMobileHooksActionsConfigController();
