// ================================================================
// Mobile Hook Configuration Constants
// ================================================================

const BASE = 'mobile.hooks';

export const MOBILE_HOOK_SETTING_KEYS = Object.freeze({
  ENABLED: `${BASE}.enabled`,
  ACTIONS_MAPPINGS: `${BASE}.actions.mappings`,
  ACTIONS_SETTINGS: `${BASE}.actions.settings`,
  ANALYTICS_ENABLED: `${BASE}.analytics.enabled`,
  ERROR_REPORTING_ENABLED: `${BASE}.error_reporting.enabled`,
  OFFLINE_STORAGE_ENABLED: `${BASE}.offline_storage.enabled`,
  PERFORMANCE_MONITORING_ENABLED: `${BASE}.performance_monitoring.enabled`,
  BATCH_UPLOAD_INTERVAL: `${BASE}.batch_upload_interval`,
  MAX_OFFLINE_EVENTS: `${BASE}.max_offline_events`,
  EMERGENCY_ENABLED: `${BASE}.emergency.enabled`,
  EMERGENCY_REASON: `${BASE}.emergency.reason`,
} as const);

// Mobile hooks metadata
export const MOBILE_HOOKS_METADATA = {
  CATEGORY: "mobile_hooks",
  DATA_TYPE: "string",
  VERSION: "1.0.0",
  RESOURCE_TYPE: "mobile_config",
  ENTITY_ID: "mobile_hook_listeners",
} as const;

export const MOBILE_HOOKS_SETTINGS_ACTIONS = Object.freeze({
  UPDATE: 'update',
  RESET: 'reset',
} as const);

export interface MobileHooksListenerSettings {
  analyticsEnabled: boolean;
  errorReportingEnabled: boolean;
  offlineStorageEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  batchUploadInterval: number; // seconds
  maxOfflineEvents: number;
}
