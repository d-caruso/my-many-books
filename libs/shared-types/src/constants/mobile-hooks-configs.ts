// ================================================================
// libs/shared-types/src/constants/mobile-hooks-configs.ts
// Mobile Hook Configuration Constants
// ================================================================

// MOBILE_HOOKS hook setting suffixes (single source of truth)
  const HOOK_SUFFIXES = {
    ANALYTICS: 'analytics.enabled',
    ERROR_REPORTING: 'error_reporting.enabled',
    PERFORMANCE_MONITORING: 'performance_monitoring.enabled',
    BATCH_UPLOAD_INTERVAL: 'batch_upload_interval',
    MAX_OFFLINE_EVENTS: 'max_offline_events',
  } as const;

// Export base patterns for dynamic key building
export const BASE_HOOKS = 'mobile.hooks';
export const GLOBAL_SCOPE = 'global';
export const USER_SCOPE = 'user';

export const MOBILE_HOOK_SETTING_KEYS = Object.freeze({
  ENABLED: `${BASE_HOOKS}.${GLOBAL_SCOPE}.enabled`,
  ACTIONS_MAPPINGS: `${BASE_HOOKS}.${GLOBAL_SCOPE}.actions.mappings`,
  ACTIONS_SETTINGS: `${BASE_HOOKS}.${GLOBAL_SCOPE}.actions.settings`,

  ANALYTICS_ENABLED: `${BASE_HOOKS}.${GLOBAL_SCOPE}.${HOOK_SUFFIXES.ANALYTICS}`,
  ERROR_REPORTING_ENABLED: `${BASE_HOOKS}.${GLOBAL_SCOPE}.${HOOK_SUFFIXES.ERROR_REPORTING}`,
  PERFORMANCE_MONITORING_ENABLED: `${BASE_HOOKS}.${GLOBAL_SCOPE}.${HOOK_SUFFIXES.PERFORMANCE_MONITORING}`,
  BATCH_UPLOAD_INTERVAL: `${BASE_HOOKS}.${GLOBAL_SCOPE}.${HOOK_SUFFIXES.BATCH_UPLOAD_INTERVAL}`,
  MAX_OFFLINE_EVENTS: `${BASE_HOOKS}.${GLOBAL_SCOPE}.${HOOK_SUFFIXES.MAX_OFFLINE_EVENTS}`,
  
  EMERGENCY_ENABLED: `${BASE_HOOKS}.${GLOBAL_SCOPE}.emergency.enabled`,
  EMERGENCY_REASON: `${BASE_HOOKS}.${GLOBAL_SCOPE}.emergency.reason`,
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
  performanceMonitoringEnabled: boolean;
  batchUploadInterval: number; // seconds
  maxOfflineEvents: number;
}

// User hook setting overrides (without user.{userId} part, that's injected at runtime)
export const USER_HOOK_SETTING_KEYS = Object.freeze({
  ANALYTICS_ENABLED: `${BASE_HOOKS}.${USER_SCOPE}.${HOOK_SUFFIXES.ANALYTICS}`,
  ERROR_REPORTING_ENABLED: `${BASE_HOOKS}.${USER_SCOPE}.${HOOK_SUFFIXES.ERROR_REPORTING}`,
  PERFORMANCE_MONITORING_ENABLED: `${BASE_HOOKS}.${USER_SCOPE}.${HOOK_SUFFIXES.PERFORMANCE_MONITORING}`,
  BATCH_UPLOAD_INTERVAL: `${BASE_HOOKS}.${USER_SCOPE}.${HOOK_SUFFIXES.BATCH_UPLOAD_INTERVAL}`,
  MAX_OFFLINE_EVENTS: `${BASE_HOOKS}.${USER_SCOPE}.${HOOK_SUFFIXES.MAX_OFFLINE_EVENTS}`,
} as const);

// Base patterns for dynamic keys (exported for controllers)
export const HOOK_KEY_PATTERNS = Object.freeze({
  ACTIONS_BASE: `${BASE_HOOKS}.${GLOBAL_SCOPE}.actions`,
  LISTENERS_BASE: `${BASE_HOOKS}.${GLOBAL_SCOPE}.listeners`,
  CATEGORIES_BASE: `${BASE_HOOKS}.${GLOBAL_SCOPE}.categories`,
} as const);