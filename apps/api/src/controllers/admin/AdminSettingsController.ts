// ================================================================
// src/controllers/admin/AdminSettingsController.ts
// Admin settings management controller
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { getLogger } from '@my-many-books/shared-logging';
import { UniversalRequest } from '../../types';
import { Setting } from '../../models';
import { getAuditLogService } from '../../services/AuditLogService';
import { SearchSettingsService } from '../../services/SearchSettingsService';

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

    // Check env vars to determine source and if changeable
    const forceDisabled = process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true';
    const forceEnabled = process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true';

    if (forceDisabled) {
      return this.createSuccessResponse({
        enabled: false,
        source: 'force_disabled',
        canChange: false,
      });
    }

    if (forceEnabled) {
      return this.createSuccessResponse({
        enabled: true,
        source: 'force_enabled',
        canChange: false,
      });
    }

    // Check database setting
    try {
      const setting = await Setting.findOne({ where: { key: 'audit_logging_enabled' } });
      if (setting) {
        return this.createSuccessResponse({
          enabled: setting.value === 'true',
          source: 'database',
          canChange: true,
        });
      }
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to query audit logging setting:');
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
    }

    // Default
    return this.createSuccessResponse({
      enabled: true,
      source: 'default',
      canChange: true,
    });
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

    // Check if changeable
    const forceDisabled = process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true';
    const forceEnabled = process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true';

    if (forceDisabled || forceEnabled) {
      return this.createErrorResponseI18n('errors:SETTING_ENFORCED_BY_CONFIG', 403);
    }

    const body = this.parseBody(request);
    if (!this.isAuditLoggingUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      // Upsert setting
      await Setting.upsert({
        key: 'audit_logging_enabled',
        value: body.enabled ? 'true' : 'false',
        description: 'Enable or disable audit logging (true/false)',
      });

      // Invalidate cache
      getAuditLogService().invalidateCache();

      return this.createSuccessResponse({
        enabled: body.enabled,
        source: 'database',
        canChange: true,
      });
    } catch (error) {
      getLogger().error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to update audit logging setting:');
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
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
      const searchSettingsService = new SearchSettingsService();
      const status = await searchSettingsService.getFulltextStatus();

      return this.createSuccessResponse(status);
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get search settings status:'
      );
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
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
      const searchSettingsService = new SearchSettingsService();

      // Check if enabled can be changed
      if (body.enabled !== undefined) {
        const forceDisabled = process.env['SEARCH_FULLTEXT_FORCE_DISABLED'] === 'true';
        const forceEnabled = process.env['SEARCH_FULLTEXT_FORCE_ENABLED'] === 'true';

        if (forceDisabled || forceEnabled) {
          return this.createErrorResponseI18n('errors:SETTING_ENFORCED_BY_CONFIG', 403);
        }

        await searchSettingsService.updateFulltextEnabled(body.enabled);
      }

      if (body.sortableFields !== undefined) {
        await searchSettingsService.updateSortableFields(body.sortableFields);
      }

      if (body.defaultSort !== undefined) {
        await searchSettingsService.updateDefaultSort(body.defaultSort);
      }

      // Return updated status
      const status = await searchSettingsService.getFulltextStatus();
      return this.createSuccessResponse(status);
    } catch (error) {
      getLogger().error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to update search settings:'
      );
      return this.createErrorResponseI18n('errors:INTERNAL_ERROR', 500);
    }
  }
}

export const adminSettingsController = new AdminSettingsController();
