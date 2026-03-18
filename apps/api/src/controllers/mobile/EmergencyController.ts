// ================================================================
// src/controllers/EmergencyController.ts
// Emergency kill switch configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import {
  emergencyConfigService,
  type EmergencyConfigUpdateRequest,
} from '../../services/config/EmergencyConfigService';

export type { EmergencyConfigResponse } from '../../services/config/EmergencyConfigService';

export class EmergencyController extends BaseController {
  private isEmergencyConfigUpdateRequest(value: unknown): value is EmergencyConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (
      value['mobileHooksEnabled'] !== undefined &&
      typeof value['mobileHooksEnabled'] !== 'boolean'
    ) {
      return false;
    }

    if (value['apiHooksEnabled'] !== undefined && typeof value['apiHooksEnabled'] !== 'boolean') {
      return false;
    }

    if (
      value['globalKillSwitch'] !== undefined &&
      typeof value['globalKillSwitch'] !== 'boolean'
    ) {
      return false;
    }

    if (value['emergencyReason'] !== undefined) {
      if (
        value['emergencyReason'] !== null &&
        typeof value['emergencyReason'] !== 'string'
      ) {
        return false;
      }
    }

    if (value['emergencyContacts'] !== undefined) {
      if (
        !Array.isArray(value['emergencyContacts']) ||
        !value['emergencyContacts'].every(contact => typeof contact === 'string')
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * GET /api/<version>/config/emergency - Get emergency kill switches
   */
  async getEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      return this.createSuccessResponse(await emergencyConfigService.getConfig());
    } catch {
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * PUT /api/<version>/config/emergency - Update emergency settings
   */
  async updateEmergencyConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const body = this.parseBody(request);
    if (!this.isEmergencyConfigUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await emergencyConfigService.updateConfig(body, request),
        'Emergency configuration updated successfully'
      );
    } catch {
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }
}

export const emergencyController = new EmergencyController();
