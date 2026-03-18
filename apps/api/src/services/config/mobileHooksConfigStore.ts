import {
  HEALTH_STATUS,
  MOBILE_HOOK_SETTING_KEYS,
  MOBILE_HOOKS_METADATA,
  type MobileHooksListenerSettings,
} from '@my-many-books/shared-types';
import { AppSetting } from '../../models';
import { TABLE_NAMES } from '../../utils/constants';
import {
  getLatestAppSettingUpdateByKeys,
  getLatestAppSettingUpdateByPrefix,
  loadAppSettingValueMapByKeys,
  loadAppSettingValueMapByPrefix,
  upsertAppSetting,
} from './appSettingStore';
import {
  ACTION_TYPES,
  ACTIONS_BASE,
  AVAILABLE_EVENTS,
  CATEGORIES_BASE,
  LISTENERS_BASE,
  type ActionSettings,
  type HookActionConfigResponse,
  type HookActionMapping,
  type HookListenerMap,
  type HookListenersResponse,
} from './MobileHooksConfig.types';

export const DEFAULT_LISTENER_SETTINGS: MobileHooksListenerSettings = {
  analyticsEnabled: true,
  errorReportingEnabled: true,
  performanceMonitoringEnabled: true,
};

export const DEFAULT_ACTION_MAPPINGS: HookActionMapping = {
  'error.unhandled': [ACTION_TYPES.EMAIL, ACTION_TYPES.SLACK, ACTION_TYPES.DATABASE],
  'error.promise_rejection': [ACTION_TYPES.EMAIL, ACTION_TYPES.DATABASE],
  'app.termination': [ACTION_TYPES.DATABASE],
  'app.memory_warning': [ACTION_TYPES.EMAIL, ACTION_TYPES.SLACK],
  'network.offline': [ACTION_TYPES.DATABASE],
  'sync.failed': [ACTION_TYPES.EMAIL, ACTION_TYPES.DATABASE],
};

export const getDefaultActionSettings = (): ActionSettings => ({
  email: {
    enabled: false,
    recipients: [],
    rate_limit_minutes: 5,
    template: 'mobile_alert',
    priority: 'medium',
    expected_fields: ['recipients'],
  },
  slack: {
    enabled: false,
    channel: '',
    rate_limit_minutes: 2,
    mention_users: [],
    expected_fields: ['channel'],
  },
  webhook: {
    enabled: false,
    endpoints: [],
    rate_limit_minutes: 1,
    timeout_seconds: 10,
    retry_attempts: 3,
    expected_fields: ['webhook'],
  },
  database: {
    enabled: true,
    table: TABLE_NAMES.MOBILE_ANALYTICS_EVENTS,
    batch_size: 100,
    retention_days: 90,
    expected_fields: ['table'],
  },
  push_notification: {
    enabled: false,
    rate_limit_minutes: 10,
    priority: 'medium',
    expected_fields: [],
  },
  sms: {
    enabled: false,
    recipients: [],
    rate_limit_minutes: 60,
    emergency_only: true,
    expected_fields: ['recipients'],
  },
});

export const loadActionConfig = async (): Promise<HookActionConfigResponse> => {
  const settingsMap = await loadAppSettingValueMapByPrefix(`${ACTIONS_BASE}.`);
  const mappings = parseActionMappings(settingsMap.get(`${ACTIONS_BASE}.mappings`));
  const actionSettings = getDefaultActionSettings();

  for (const actionType of Object.values(ACTION_TYPES)) {
    const settingsValue = settingsMap.get(`${ACTIONS_BASE}.settings.${actionType}`);
    if (!settingsValue) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(settingsValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.assign(actionSettings[actionType], parsed);
      }
    } catch {
      // Keep defaults on invalid JSON.
    }
  }

  return {
    actions: mappings,
    actionSettings,
    availableEvents: [...AVAILABLE_EVENTS],
    lastUpdated: await getLatestAppSettingUpdateByPrefix(`${ACTIONS_BASE}.`),
  };
};

export const loadHookListeners = async (): Promise<HookListenersResponse> => {
  const listenerSettings = await loadAppSettingValueMapByPrefix(`${LISTENERS_BASE}.`);
  const categorySettings = await loadAppSettingValueMapByPrefix(`${CATEGORIES_BASE}.`);

  const listeners = buildListenerMap(
    {
      'error.unhandled': { enabled: true },
      'error.promise_rejection': { enabled: true },
      'app.startup': { enabled: true },
      'app.termination': { enabled: true },
      'network.offline': { enabled: true },
      'network.online': { enabled: true },
      'sync.complete': { enabled: true },
      'sync.failed': { enabled: false },
    },
    listenerSettings,
    LISTENERS_BASE
  );

  const categories = buildListenerMap(
    {
      error_listeners: { enabled: true },
      analytics_listeners: { enabled: true },
      performance_listeners: { enabled: true },
      user_behavior_listeners: { enabled: true },
    },
    categorySettings,
    CATEGORIES_BASE
  );

  const lastUpdated = [LISTENERS_BASE, CATEGORIES_BASE]
    .map(prefix => prefix)
    .reduce<Promise<string | null>>(async (latestPromise, prefix) => {
      const currentLatest = await latestPromise;
      const nextLatest = await getLatestAppSettingUpdateByPrefix(`${prefix}.`);
      if (!currentLatest) {
        return nextLatest;
      }
      if (!nextLatest) {
        return currentLatest;
      }
      return new Date(nextLatest).getTime() > new Date(currentLatest).getTime()
        ? nextLatest
        : currentLatest;
    }, Promise.resolve(null));

  return {
    listeners,
    categories,
    availableEvents: [...AVAILABLE_EVENTS],
    lastUpdated: await lastUpdated,
  };
};

export const loadListenerSettings = async (): Promise<MobileHooksListenerSettings> => {
  const settings = await loadAppSettingValueMapByKeys(Object.values(MOBILE_HOOK_SETTING_KEYS));

  return {
    analyticsEnabled:
      settings.get(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED) !== 'false',
    errorReportingEnabled:
      settings.get(MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED) !== 'false',
    performanceMonitoringEnabled:
      settings.get(MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED) !== 'false',
  };
};

export const getListenerSettingsLastUpdated = async (): Promise<string | null> =>
  getLatestAppSettingUpdateByKeys(Object.values(MOBILE_HOOK_SETTING_KEYS));

export const saveMobileHookSetting = async (key: string, value: string): Promise<void> => {
  await upsertAppSetting({
    key,
    value,
    category: MOBILE_HOOKS_METADATA.CATEGORY,
    type: MOBILE_HOOKS_METADATA.DATA_TYPE,
    description: `Mobile hook settings: ${key}`,
  });
};

export const getEmergencyStatusData = async (): Promise<{
  enabled: boolean;
  disabledReason: string | null;
  disabledAt: string | null;
}> => {
  const emergencySetting = await AppSetting.findOne({
    where: { key: MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED },
  });
  const settings = await loadAppSettingValueMapByKeys([
    MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED,
    MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON,
  ]);

  return {
    enabled: settings.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_ENABLED) !== 'false',
    disabledReason: settings.get(MOBILE_HOOK_SETTING_KEYS.EMERGENCY_REASON) ?? null,
    disabledAt:
      emergencySetting?.value === 'false'
        ? emergencySetting.updateDate?.toISOString() ?? null
        : null,
  };
};

export const getMobileHooksHealth = async () => {
  const settings = await loadListenerSettings();
  const emergency = await getEmergencyStatusData();

  const checks = {
    settingsLoaded: true,
    emergencyEnabled: emergency.enabled,
    analyticsActive: settings.analyticsEnabled && emergency.enabled,
    errorReportingActive: settings.errorReportingEnabled && emergency.enabled,
    performanceMonitoringActive: settings.performanceMonitoringEnabled && emergency.enabled,
  };

  const activeCount = Object.values(checks).filter(value => value === true).length;
  const totalCount = Object.keys(checks).length;
  const healthScore = Math.round((activeCount / totalCount) * 100);

  return {
    status: emergency.enabled
      ? healthScore >= 80
        ? HEALTH_STATUS.HEALTHY
        : HEALTH_STATUS.DEGRADED
      : HEALTH_STATUS.DISABLED,
    healthScore,
    checks,
    timestamp: new Date().toISOString(),
  };
};

const parseActionMappings = (value: string | undefined): HookActionMapping => {
  if (!value) {
    return { ...DEFAULT_ACTION_MAPPINGS };
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (isHookActionMapping(parsed)) {
      return parsed;
    }
  } catch {
    // Keep defaults on invalid JSON.
  }

  return { ...DEFAULT_ACTION_MAPPINGS };
};

const isHookActionMapping = (value: unknown): value is HookActionMapping => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    actions =>
      Array.isArray(actions) &&
      actions.every(
        action => typeof action === 'string' && Object.values(ACTION_TYPES).includes(action as never)
      )
  );
};

const buildListenerMap = (
  defaults: HookListenerMap,
  values: Map<string, string>,
  prefix: string
): HookListenerMap => {
  const result = { ...defaults };

  for (const [key, value] of Array.from(values.entries())) {
    const name = key.replace(`${prefix}.`, '').replace('.enabled', '');
    result[name] = { enabled: value !== 'false' };
  }

  return result;
};
