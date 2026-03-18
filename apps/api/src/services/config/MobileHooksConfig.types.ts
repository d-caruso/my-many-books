import { BASE_HOOKS, GLOBAL_SCOPE } from '@my-many-books/shared-types';

export const ACTIONS_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.actions`;
export const LISTENERS_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.listeners`;
export const CATEGORIES_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.categories`;

export const ACTION_TYPES = {
  EMAIL: 'email',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  DATABASE: 'database',
  PUSH_NOTIFICATION: 'push_notification',
  SMS: 'sms',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  email: 'Send email notifications to configured recipients',
  slack: 'Send messages to Slack channels with optional user mentions',
  webhook: 'Send HTTP POST requests to external webhook endpoints',
  database: 'Store events in database tables for analytics',
  push_notification: 'Send push notifications to mobile devices',
  sms: 'Send SMS messages for critical alerts',
};

export type HookActionMapping = Record<string, ActionType[]>;

export interface ActionSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    template: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expected_fields: string[];
  };
  slack: {
    enabled: boolean;
    channel: string;
    rate_limit_minutes: number;
    mention_users: string[];
    webhook_url?: string;
    expected_fields: string[];
  };
  webhook: {
    enabled: boolean;
    endpoints: string[];
    rate_limit_minutes: number;
    timeout_seconds: number;
    retry_attempts: number;
    webhook_url?: string;
    expected_fields: string[];
  };
  database: {
    enabled: boolean;
    table: string;
    batch_size: number;
    retention_days: number;
    expected_fields: string[];
  };
  push_notification: {
    enabled: boolean;
    rate_limit_minutes: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expected_fields: string[];
  };
  sms: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    emergency_only: boolean;
    expected_fields: string[];
  };
}

export type ActionSettingsUpdateRequest = Partial<ActionSettings[ActionType]>;

export type HookListenerMap = Record<string, { enabled: boolean }>;
export type HookListenerToggle = boolean | { enabled: boolean };
export type HookListenerUpdateMap = Record<string, HookListenerToggle>;

export interface HookListenersResponse {
  listeners: HookListenerMap;
  categories: HookListenerMap;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface HookActionConfigResponse {
  actions: HookActionMapping;
  actionSettings: ActionSettings;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface HookActionConfigUpdateRequest {
  actions?: HookActionMapping;
  actionSettings?: Partial<ActionSettings>;
}

export interface HookListenerUpdateRequest {
  listeners?: HookListenerUpdateMap;
  categories?: HookListenerUpdateMap;
  analytics?: boolean;
  errorReporting?: boolean;
  offlineStorage?: boolean;
  performanceMonitoring?: boolean;
}

export interface TestConfigRequestBody {
  eventType?: string;
  payload?: Record<string, unknown>;
}

export interface TestActionTypeRequestBody {
  actionType: ActionType;
  dryRun?: boolean;
  testData?: Record<string, unknown>;
}

export interface ActionExecutionDetails {
  enabled?: boolean;
  recipientCount?: number;
  endpoints?: number;
  results?: unknown[];
  channel?: string;
  endpointCount?: number;
  table?: string;
  recipients?: number;
  result?: unknown;
}

export interface ActionExecutionResult {
  success: boolean;
  message: string;
  details?: ActionExecutionDetails;
}

export interface ActionTypeDetails {
  description: string;
  enabled: boolean;
  configured: boolean;
  warnings: string[];
  settings: ActionSettings[ActionType];
}

export const AVAILABLE_EVENTS = [
  'error.unhandled',
  'error.promise_rejection',
  'app.startup',
  'app.termination',
  'app.memory_warning',
  'network.offline',
  'network.timeout',
  'sync.failed',
  'performance.slow',
] as const;
