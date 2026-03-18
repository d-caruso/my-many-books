// ================================================================
// src/controllers/UserMobileHooksSettingsController.ts
// User-specific mobile hook settings endpoints (overrides admin defaults)
// ================================================================

import { UserBaseController } from '../base/UserBaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import {
  userMobileConfigService,
  type UserMobileHooksSettingsUpdateRequest,
} from '../../services/config/UserMobileConfigService';

export class UserMobileHooksSettingsController extends UserBaseController {
  private isUserMobileHooksUpdateRequest(value: unknown): value is UserMobileHooksSettingsUpdateRequest {
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
      return this.createErrorResponseI18n('errors:valid_id_required', 400, { resource: 'user' });
    }

    // Check if user can update this config (self or admin)
    if (!this.hasUserAccess(request, userId)) {
      return this.createAccessDeniedResponse(request);
    }

    try {
      return this.createSuccessResponse(
        await userMobileConfigService.getUserMobileHooksSettings(userId)
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * PUT /api/users/{id}/mobile-hooks/settings - Update user's mobile hooks settings
   */
  async updateSettings(request: UniversalRequest): Promise<ApiResponse> {
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
    if (!this.isUserMobileHooksUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await userMobileConfigService.updateUserMobileHooksSettings(userId, body, request),
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

export const userMobileHooksSettingsController = new UserMobileHooksSettingsController();
