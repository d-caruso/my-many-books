// ================================================================
// libs/shared-types/src/constants/mobile-app-configs.ts
// User mobile app setting keys (suffixes only, without user.{userId}.mobile prefix)
// ================================================================

const BASE_APP = 'mobile.app';
const GLOBAL_SCOPE = 'global';
const USER_SCOPE = 'user';

// Admin global mobile app settings
export const MOBILE_APP_SETTING_KEYS = Object.freeze({
    OFFLINE_STORAGE_ENABLED: `${BASE_APP}.${GLOBAL_SCOPE}.offline_storage.enabled`,
    BATCH_UPLOAD_INTERVAL: `${BASE_APP}.${GLOBAL_SCOPE}.batch_upload_interval`,
    MAX_OFFLINE_EVENTS: `${BASE_APP}.${GLOBAL_SCOPE}.max_offline_events`,
} as const);

const NOTIFICATION = 'notification';
const PRIVACY = 'privacy';

export const USER_MOBILE_APP_SETTING_KEYS = Object.freeze({
    // General app settings
    OFFLINE_STORAGE_ENABLED: `${BASE_APP}.${USER_SCOPE}.offline_storage.enabled`,

    // Notification preferences
    NOTIFICATION_EMAIL_ENABLED: `${BASE_APP}.${USER_SCOPE}.${NOTIFICATION}.email_enabled`,
    NOTIFICATION_PUSH_ENABLED: `${BASE_APP}.${USER_SCOPE}.${NOTIFICATION}.push_enabled`,
    NOTIFICATION_SMS_ENABLED: `${BASE_APP}.${USER_SCOPE}.${NOTIFICATION}.sms_enabled`,
    NOTIFICATION_EMAIL_FREQUENCY: `${BASE_APP}.${USER_SCOPE}.${NOTIFICATION}.email_frequency`,

    // Privacy settings
    PRIVACY_DATA_COLLECTION: `${BASE_APP}.${USER_SCOPE}.${PRIVACY}.data_collection_enabled`,
    PRIVACY_ANALYTICS_SHARING: `${BASE_APP}.${USER_SCOPE}.${PRIVACY}.analytics_sharing_enabled`,
    PRIVACY_CRASH_REPORTING: `${BASE_APP}.${USER_SCOPE}.${PRIVACY}.crash_reporting_enabled`,
    } as const);

// Email notification frequency options
export const EMAIL_NOTIFICATION_FREQUENCY = Object.freeze({
    IMMEDIATE: 'immediate',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    NEVER: 'never',
} as const);

export type EmailNotificationFrequency = typeof EMAIL_NOTIFICATION_FREQUENCY[keyof typeof EMAIL_NOTIFICATION_FREQUENCY];

// Mobile app metadata
export const MOBILE_APP_METADATA = {
  CATEGORY: "mobile_app",
  DATA_TYPE: "string",
  VERSION: "1.0.0",
  RESOURCE_TYPE: "mobile_app_settings",
  ENTITY_ID: "mobile_app",
} as const;

export const MOBILE_APP_SETTINGS_ACTIONS = Object.freeze({
  UPDATE: 'update',
  RESET: 'reset',
} as const);

// Types (matching UserMobileConfigResponse from controller)
export interface NotificationPreferences {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    emailFrequency: EmailNotificationFrequency;
}

export interface PrivacySettings {
    dataCollectionEnabled: boolean;
    analyticsSharingEnabled: boolean;
    crashReportingEnabled: boolean;
}

export interface MobileAppSettings {
    offlineStorageEnabled: boolean;
    batchUploadInterval: number; // seconds
    maxOfflineEvents: number;
}

export interface UserMobileAppSettings {
    offlineStorageEnabled: boolean;
    notificationPreferences: NotificationPreferences;
    privacySettings: PrivacySettings;
}