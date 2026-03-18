import {
  MOBILE_HOOK_SETTING_KEYS,
  MOBILE_HOOKS_METADATA,
  MOBILE_HOOKS_SETTINGS_ACTIONS,
} from '@my-many-books/shared-types';
import { isJsonObject } from '../../types/json';
import type { UniversalRequest } from '../../types';
import { getAuditLogService } from '../AuditLogService';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import {
  DEFAULT_LISTENER_SETTINGS,
  getEmergencyStatusData,
  getListenerSettingsLastUpdated,
  getMobileHooksHealth,
  loadHookListeners,
  loadListenerSettings,
  saveMobileHookSetting,
} from './mobileHooksConfigStore';
import { CATEGORIES_BASE, LISTENERS_BASE, type HookListenerUpdateRequest } from './MobileHooksConfig.types';

export const getHookListeners = async () => loadHookListeners();

export const updateHookActionListeners = async (
  changes: HookListenerUpdateRequest,
  request: UniversalRequest
) => {
  const updatedSettings: string[] = [];
  const normalizedListeners = normalizeToggles(changes.listeners);
  const normalizedCategories = normalizeToggles(changes.categories);
  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.LISTENERS.UPDATE,
      'BEFORE',
      {
        actor,
        changes,
      }
    );

    for (const [eventName, enabled] of Object.entries(normalizedListeners)) {
      await saveMobileHookSetting(`${LISTENERS_BASE}.${eventName}.enabled`, String(enabled));
      updatedSettings.push(`listeners.${eventName}`);
    }

    for (const [categoryName, enabled] of Object.entries(normalizedCategories)) {
      await saveMobileHookSetting(`${CATEGORIES_BASE}.${categoryName}.enabled`, String(enabled));
      updatedSettings.push(`categories.${categoryName}`);
    }

    if (typeof changes.analytics === 'boolean') {
      await saveMobileHookSetting(
        MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
        String(changes.analytics)
      );
      updatedSettings.push('analytics');
    }

    if (typeof changes.errorReporting === 'boolean') {
      await saveMobileHookSetting(
        MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
        String(changes.errorReporting)
      );
      updatedSettings.push('errorReporting');
    }

    if (typeof changes.performanceMonitoring === 'boolean') {
      await saveMobileHookSetting(
        MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
        String(changes.performanceMonitoring)
      );
      updatedSettings.push('performanceMonitoring');
    }

    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.LISTENERS.UPDATE,
      'AFTER',
      {
        actor,
        changes,
        updated: updatedSettings,
      }
    );

    return {
      updated: updatedSettings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.LISTENERS.UPDATE,
      'FAILURE',
      { actor, changes, error }
    );
    throw error;
  }
};

export const getListenerSettings = async () => ({
  settings: await loadListenerSettings(),
  lastUpdated: await getListenerSettingsLastUpdated(),
  version: MOBILE_HOOKS_METADATA.VERSION,
});

export const updateListenerSettings = async (
  changes: Partial<{
    analyticsEnabled: boolean;
    errorReportingEnabled: boolean;
    performanceMonitoringEnabled: boolean;
  }>,
  request: UniversalRequest
) => {
  const previousSettings = await loadListenerSettings();
  const updatedSettings: Array<{ key: string; value: string }> = [];
  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.UPDATE,
      'BEFORE',
      {
        actor,
        previousSettings,
        changes,
      }
    );

    await saveListenerSetting(
      MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
      changes.analyticsEnabled,
      'analyticsEnabled',
      updatedSettings
    );
    await saveListenerSetting(
      MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
      changes.errorReportingEnabled,
      'errorReportingEnabled',
      updatedSettings
    );
    await saveListenerSetting(
      MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
      changes.performanceMonitoringEnabled,
      'performanceMonitoringEnabled',
      updatedSettings
    );

    getAuditLogService().logActionFromRequest(
      request,
      MOBILE_HOOKS_SETTINGS_ACTIONS.UPDATE,
      MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
      MOBILE_HOOKS_METADATA.ENTITY_ID,
      {
        changes: updatedSettings,
        previousSettings,
        newSettings: changes,
      }
    );

    const settings = await loadListenerSettings();

    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.UPDATE,
      'AFTER',
      {
        actor,
        previousSettings,
        settings,
        updated: updatedSettings.map(setting => setting.key),
      }
    );

    return {
      settings,
      updated: updatedSettings.map(setting => setting.key),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.UPDATE,
      'FAILURE',
      {
        actor,
        changes,
        error,
      }
    );
    throw error;
  }
};

export const resetMobileSettings = async (request: UniversalRequest) => {
  const previousSettings = await loadListenerSettings();
  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.RESET,
      'BEFORE',
      {
        actor,
        previousSettings,
      }
    );

    await saveMobileHookSetting(
      MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED,
      String(DEFAULT_LISTENER_SETTINGS.analyticsEnabled)
    );
    await saveMobileHookSetting(
      MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
      String(DEFAULT_LISTENER_SETTINGS.errorReportingEnabled)
    );
    await saveMobileHookSetting(
      MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
      String(DEFAULT_LISTENER_SETTINGS.performanceMonitoringEnabled)
    );

    getAuditLogService().logActionFromRequest(
      request,
      MOBILE_HOOKS_SETTINGS_ACTIONS.RESET,
      MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
      MOBILE_HOOKS_METADATA.ENTITY_ID,
      {
        previousSettings,
        resetToDefaults: DEFAULT_LISTENER_SETTINGS,
      }
    );

    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.RESET,
      'AFTER',
      {
        actor,
        previousSettings,
        settings: DEFAULT_LISTENER_SETTINGS,
      }
    );

    return {
      settings: DEFAULT_LISTENER_SETTINGS,
      resetToDefaults: true,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.SETTINGS.RESET,
      'FAILURE',
      { actor, error }
    );
    throw error;
  }
};

export const getEmergencyStatus = async () => {
  const emergency = await getEmergencyStatusData();
  return {
    enabled: emergency.enabled,
    disabledAt: emergency.disabledAt,
    disabledReason: emergency.disabledReason,
  };
};

export const updateEmergencyStatus = async (
  changes: { enabled: boolean; reason?: string },
  request: UniversalRequest
) => {
  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.EMERGENCY.UPDATE,
      'BEFORE',
      {
        actor,
        changes,
      }
    );

    await saveMobileHookSetting(
      MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED,
      String(changes.enabled)
    );

    if (changes.reason) {
      await saveMobileHookSetting(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON, changes.reason);
    }

    getAuditLogService().logActionFromRequest(
      request,
      changes.enabled ? 'emergency_enable' : 'emergency_disable',
      MOBILE_HOOKS_METADATA.RESOURCE_TYPE,
      MOBILE_HOOKS_METADATA.ENTITY_ID,
      { enabled: changes.enabled, reason: changes.reason }
    );

    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.EMERGENCY.UPDATE,
      'AFTER',
      {
        actor,
        enabled: changes.enabled,
        reason: changes.reason ?? null,
      }
    );

    return {
      enabled: changes.enabled,
      updatedAt: new Date().toISOString(),
      message: changes.enabled ? 'Mobile hooks enabled' : 'Mobile hooks disabled (emergency)',
    };
  } catch (error) {
    void controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.EMERGENCY.UPDATE,
      'FAILURE',
      { actor, changes, error }
    );
    throw error;
  }
};

export const getHealth = async () => getMobileHooksHealth();

const normalizeToggles = (
  values: Record<string, boolean | { enabled: boolean }> | undefined
): Record<string, boolean> => {
  const normalized: Record<string, boolean> = {};

  for (const [key, toggle] of Object.entries(values || {})) {
    if (typeof toggle === 'boolean') {
      normalized[key] = toggle;
      continue;
    }

    if (isJsonObject(toggle) && typeof toggle.enabled === 'boolean') {
      normalized[key] = toggle.enabled;
      continue;
    }

    throw new Error('INVALID_HOOK_TOGGLE');
  }

  return normalized;
};

const saveListenerSetting = async (
  key: string,
  value: boolean | undefined,
  responseKey: string,
  updatedSettings: Array<{ key: string; value: string }>
): Promise<void> => {
  if (typeof value !== 'boolean') {
    return;
  }

  await saveMobileHookSetting(key, String(value));
  updatedSettings.push({ key: responseKey, value: String(value) });
};
