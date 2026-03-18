import { Setting } from '../../models';
import { getAuditLogService } from '../AuditLogService';
import { SearchSettingsService } from '../SearchSettingsService';
import { SettingsService as RuntimeSettingsService } from '../SettingsService';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import type { FulltextStatus } from '../SearchSettingsService';
import type { UniversalRequest } from '../../types';

type RequestUser = UniversalRequest['user'];

export interface AuditLoggingStatus {
  enabled: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
  canChange: boolean;
}

export interface SearchSettingsUpdateInput {
  enabled?: boolean;
  sortableFields?: string[];
  defaultSort?: string;
}

class SettingsService {
  getAllSettings() {
    return RuntimeSettingsService.getAllSettings();
  }

  getSetting<T = unknown>(key: string): T | null {
    return RuntimeSettingsService.getSetting<T>(key);
  }

  async getAllSettingsAdmin() {
    return RuntimeSettingsService.getAllSettingsAdmin();
  }

  async updateSetting(key: string, value: unknown, user: RequestUser) {
    const actor = controlPlaneHookService.getActorContext(user);

    try {
      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.UPDATE, 'BEFORE', {
        actor,
        key,
        value,
      });

      const updated = await RuntimeSettingsService.updateSetting(key, value);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.UPDATE, 'AFTER', {
        actor,
        key,
        setting: updated,
      });

      return updated;
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.SETTINGS.UPDATE,
        'FAILURE',
        {
          actor,
          key,
          value,
          error,
        }
      );
      throw error;
    }
  }

  async toggleActive(key: string, active: boolean, user: RequestUser) {
    const actor = controlPlaneHookService.getActorContext(user);

    try {
      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.TOGGLE, 'BEFORE', {
        actor,
        key,
        active,
      });

      const updated = await RuntimeSettingsService.toggleActive(key, active);

      await controlPlaneHookService.emitLifecycleEvent(EVENTS.CONFIG.SETTINGS.TOGGLE, 'AFTER', {
        actor,
        key,
        setting: updated,
      });

      return updated;
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.SETTINGS.TOGGLE,
        'FAILURE',
        {
          actor,
          key,
          active,
          error,
        }
      );
      throw error;
    }
  }

  async getAuditLoggingStatus(): Promise<AuditLoggingStatus> {
    const forceDisabled = process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true';
    const forceEnabled = process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true';

    if (forceDisabled) {
      return {
        enabled: false,
        source: 'force_disabled',
        canChange: false,
      };
    }

    if (forceEnabled) {
      return {
        enabled: true,
        source: 'force_enabled',
        canChange: false,
      };
    }

    const setting = await Setting.findOne({ where: { key: 'audit_logging_enabled' } });
    if (setting) {
      return {
        enabled: setting.value === 'true',
        source: 'database',
        canChange: true,
      };
    }

    return {
      enabled: true,
      source: 'default',
      canChange: true,
    };
  }

  async updateAuditLoggingStatus(enabled: boolean, request: UniversalRequest): Promise<AuditLoggingStatus> {
    const forceDisabled = process.env['AUDIT_LOGGING_FORCE_DISABLED'] === 'true';
    const forceEnabled = process.env['AUDIT_LOGGING_FORCE_ENABLED'] === 'true';

    if (forceDisabled || forceEnabled) {
      throw new Error('SETTING_ENFORCED_BY_CONFIG');
    }

    const actor = controlPlaneHookService.getActorContext(request.user);

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.AUDIT_LOGGING.UPDATE,
        'BEFORE',
        {
          actor,
          enabled,
        }
      );

      await Setting.upsert({
        key: 'audit_logging_enabled',
        value: enabled ? 'true' : 'false',
        description: 'Enable or disable audit logging (true/false)',
      });

      getAuditLogService().invalidateCache();

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.AUDIT_LOGGING.UPDATE,
        'AFTER',
        {
          actor,
          enabled,
        }
      );

      return {
        enabled,
        source: 'database',
        canChange: true,
      };
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.AUDIT_LOGGING.UPDATE,
        'FAILURE',
        {
          actor,
          enabled,
          error,
        }
      );
      throw error;
    }
  }

  async getSearchStatus(): Promise<FulltextStatus> {
    const searchSettingsService = new SearchSettingsService();
    return searchSettingsService.getFulltextStatus();
  }

  async updateSearchSettings(
    changes: SearchSettingsUpdateInput,
    request: UniversalRequest
  ): Promise<FulltextStatus> {
    const searchSettingsService = new SearchSettingsService();
    const actor = controlPlaneHookService.getActorContext(request.user);

    if (changes.enabled !== undefined) {
      const forceDisabled = process.env['SEARCH_FULLTEXT_FORCE_DISABLED'] === 'true';
      const forceEnabled = process.env['SEARCH_FULLTEXT_FORCE_ENABLED'] === 'true';

      if (forceDisabled || forceEnabled) {
        throw new Error('SETTING_ENFORCED_BY_CONFIG');
      }
    }

    try {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.SEARCH.UPDATE,
        'BEFORE',
        {
          actor,
          changes,
        }
      );

      if (changes.enabled !== undefined) {
        await searchSettingsService.updateFulltextEnabled(changes.enabled);
      }

      if (changes.sortableFields !== undefined) {
        await searchSettingsService.updateSortableFields(changes.sortableFields);
      }

      if (changes.defaultSort !== undefined) {
        await searchSettingsService.updateDefaultSort(changes.defaultSort);
      }

      const status = await searchSettingsService.getFulltextStatus();

      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.SEARCH.UPDATE,
        'AFTER',
        {
          actor,
          changes,
          status,
        }
      );

      return status;
    } catch (error) {
      await controlPlaneHookService.emitLifecycleEvent(
        EVENTS.CONFIG.SEARCH.UPDATE,
        'FAILURE',
        {
          actor,
          changes,
          error,
        }
      );
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
