// ================================================================
// src/controllers/SettingsController.ts
// Settings Controller - Handles settings endpoints
// ================================================================

import { injectable } from 'inversify';
import { BaseController } from './base/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { UniversalRequest } from '../types';
import { SettingsService } from '../services/SettingsService';
import { UpdateSettingDTO } from '../dtos/setting/UpdateSettingDTO';
import { ToggleActiveDTO } from '../dtos/setting/ToggleActiveDTO';
import { toSettingResponseDTO } from '../dtos/setting/SettingResponseDTO';
import { controlPlaneHookService } from '../services/hooks/ControlPlaneHookService';
import { EVENTS } from '../services/hooks/events';

@injectable()
export class SettingsController extends BaseController {
  /**
   * GET /settings - Get all active settings (public)
   */
  async getAllSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const settings = SettingsService.getAllSettings();
      return this.createSuccessResponse(settings.map(s => toSettingResponseDTO(s)));
    } catch {
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * GET /settings/:key - Get a specific setting (public)
   */
  async getSetting(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const key = this.getPathParameter(request, 'key');
    if (!key) {
      return this.createErrorResponseI18n('errors:valid_key_required', 400);
    }

    try {
      const value = SettingsService.getSetting(key);
      if (value === null) {
        return this.createErrorResponseI18n('errors:setting_not_found', 404, { key });
      }

      return this.createSuccessResponse({ key, value });
    } catch {
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * GET /admin/settings - Get all settings including deleted (admin only)
   * Note: Authentication/authorization handled by middleware
   */
  async getAllSettingsAdmin(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    try {
      const settings = await SettingsService.getAllSettingsAdmin();
      return this.createSuccessResponse(settings.map(s => toSettingResponseDTO(s)));
    } catch {
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * PATCH /admin/settings/:key - Update a setting value (admin only)
   * Note: Authentication/authorization handled by middleware
   */
  async updateSetting(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const key = this.getPathParameter(request, 'key');
    if (!key) {
      return this.createErrorResponseI18n('errors:valid_key_required', 400);
    }

    const body = this.parseBody(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:invalid_request_body', 400);
    }

    try {
      const dto = UpdateSettingDTO.from(body);
      const serviceInput = dto.toServiceInput();
      const actor = controlPlaneHookService.getActorContext(request.user);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.UPDATE, 'BEFORE', {
        actor,
        key,
        value: serviceInput.value,
      });

      const updated = await SettingsService.updateSetting(key, serviceInput.value);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.UPDATE, 'AFTER', {
        actor,
        key,
        setting: toSettingResponseDTO(updated),
      });

      return this.createSuccessResponse(
        toSettingResponseDTO(updated),
        this.t('settings:setting_updated')
      );
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.UPDATE, 'FAILURE', {
        actor: controlPlaneHookService.getActorContext(request.user),
        key,
        body,
        error,
      });
      if (error instanceof Error) {
        if (error.message.includes('Value is required')) {
          return this.createErrorResponseI18n('errors:value_required', 400);
        }
        if (error.message.includes('not found')) {
          return this.createErrorResponseI18n('errors:setting_not_found', 404, { key });
        }
        if (error.message.includes('deleted')) {
          return this.createErrorResponseI18n('errors:cannot_update_deleted_setting', 400, {
            key,
          });
        }
      }
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }

  /**
   * PATCH /admin/settings/:key/toggle - Toggle setting active status (admin only)
   * Note: Authentication/authorization handled by middleware
   */
  async toggleActive(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);

    const key = this.getPathParameter(request, 'key');
    if (!key) {
      return this.createErrorResponseI18n('errors:valid_key_required', 400);
    }

    const body = this.parseBody(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:invalid_request_body', 400);
    }

    try {
      const dto = ToggleActiveDTO.from(body);
      const serviceInput = dto.toServiceInput();
      const actor = controlPlaneHookService.getActorContext(request.user);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.TOGGLE, 'BEFORE', {
        actor,
        key,
        active: serviceInput.active,
      });

      const updated = await SettingsService.toggleActive(key, serviceInput.active);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.TOGGLE, 'AFTER', {
        actor,
        key,
        setting: toSettingResponseDTO(updated),
      });

      return this.createSuccessResponse(
        toSettingResponseDTO(updated),
        this.t('settings:setting_toggled')
      );
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.TOGGLE, 'FAILURE', {
        actor: controlPlaneHookService.getActorContext(request.user),
        key,
        body,
        error,
      });
      if (error instanceof Error) {
        if (error.message.includes('Active field is required')) {
          return this.createErrorResponseI18n('errors:active_field_required', 400);
        }
        if (error.message.includes('Active field must be a boolean')) {
          return this.createErrorResponseI18n('errors:active_must_be_boolean', 400);
        }
        if (error.message.includes('not found')) {
          return this.createErrorResponseI18n('errors:setting_not_found', 404, { key });
        }
      }
      return this.createErrorResponseI18n('errors:internal_server_error', 500);
    }
  }
}
