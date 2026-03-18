// ================================================================
// src/controllers/admin/AdminSettingsController.ts
// Admin settings management controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { getLogger } from '@my-many-books/shared-logging';
import { UniversalRequest } from '../../types';
import { settingsService } from '../../services/config/SettingsService';

interface AuditLoggingUpdateRequest {
  enabled: boolean;
}

interface SearchSettingsUpdateRequest {
  enabled?: boolean;
  sortableFields?: string[];
  defaultSort?: string;
}

export class AdminSettingsController extends BaseController {
  private isAuditLoggingUpdateRequest(value: unknown): value is AuditLoggingUpdateRequest {
    return this.isRecord(value) && typeof value['enabled'] === 'boolean';
  }

  private isSearchSettingsUpdateRequest(value: unknown): value is SearchSettingsUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') {
      return false;
    }

    if (value['sortableFields'] !== undefined) {
      if (
        !Array.isArray(value['sortableFields']) ||
        !value['sortableFields'].every(field => typeof field === 'string')
      ) {
        return false;
      }
    }

    if (value['defaultSort'] !== undefined && typeof value['defaultSort'] !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Get audit logging setting status
   *
   * Returns:
   * - enabled: current status (true/false)
   * - source: where the setting comes from (force_disabled, force_enabled, database, default)
   * - canChange: whether admin can change it via UI
   */
  async getAuditLoggingStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await settingsService.getAuditLoggingStatus());
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to query audit logging setting:');
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * Update audit logging setting
   *
   * Only works if no FORCE_* env vars are set
   */
  async updateAuditLoggingStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isAuditLoggingUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(
        await settingsService.updateAuditLoggingStatus(body.enabled, request)
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'SETTING_ENFORCED_BY_CONFIG') {
        return this.createErrorResponseI18n('errors:setting_enforced_by_config', 403);
      }
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to update audit logging setting:');
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * Get search fulltext setting status
   *
   * Returns:
   * - enabled: current status (true/false)
   * - source: where the setting comes from (force_disabled, force_enabled, database, default)
   * - canChange: whether admin can change it via UI
   * - sortableFields: array of sortable field names
   * - defaultSort: default sort field
   */
  async getSearchStatus(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      return this.createSuccessResponse(await settingsService.getSearchStatus());
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get search settings status:'
      );
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * Update search settings
   *
   * Can update: enabled, sortableFields, defaultSort
   * Only works if no FORCE_* env vars are set for enabled
   */
  async updateSearchSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isSearchSettingsUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      return this.createSuccessResponse(await settingsService.updateSearchSettings(body, request));
    } catch (error) {
      if (error instanceof Error && error.message === 'SETTING_ENFORCED_BY_CONFIG') {
        return this.createErrorResponseI18n('errors:setting_enforced_by_config', 403);
      }
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to update search settings:'
      );
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }
}

export const adminSettingsController = new AdminSettingsController();
