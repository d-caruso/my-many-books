import type {
  MobileHooksListenerSettings,
  HealthStatus,
  MobileAnalyticsStats,
  MobileAnalyticsActionTypeBreakdown,
  MobileAnalyticsProcessingStatus,
} from '@my-many-books/shared-types';

export type MobileAnalyticsStatsResponse = MobileAnalyticsStats;

export interface AuditLoggingStatus {
  enabled: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
  canChange: boolean;
}

export interface FullTextSearchStatus {
  enabled: boolean;
  source: 'force_disabled' | 'force_enabled' | 'database' | 'default';
  canChange: boolean;
  sortableFields?: string[];
  defaultSort?: string;
}

export interface AdminMobileHooksListenerSettingsResponse {
  settings: MobileHooksListenerSettings;
  lastUpdated: string | null;
  version: string;
}

export interface AdminMobileHooksListenerSettingsUpdateResponse {
  settings: MobileHooksListenerSettings;
  updated: string[];
  lastUpdated: string;
}

export type AdminMobileHooksConfigListenerMap = Record<string, { enabled: boolean }>;

export interface AdminMobileHooksConfigListenersResponse {
  listeners: AdminMobileHooksConfigListenerMap;
  categories: AdminMobileHooksConfigListenerMap;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface AdminMobileHooksConfigListenersUpdateRequest {
  listeners?: Record<string, { enabled: boolean }>;
  categories?: Record<string, { enabled: boolean }>;
  analytics?: boolean;
  errorReporting?: boolean;
  offlineStorage?: boolean;
  performanceMonitoring?: boolean;
}

export interface AdminMobileHooksConfigListenersUpdateResponse {
  updated: string[];
  lastUpdated: string;
}

export type AdminMobileHooksActionMappings = Record<string, string[]>;

export interface AdminMobileHooksActionsConfigMappingsResponse {
  actions: AdminMobileHooksActionMappings;
  actionSettings: Record<string, unknown>;
  availableEvents: string[];
  lastUpdated: string | null;
}

export interface AdminMobileHooksActionsConfigMappingsUpdateRequest {
  actions?: AdminMobileHooksActionMappings;
  actionSettings?: Record<string, unknown>;
}

export interface AdminMobileHooksActionsConfigMappingsUpdateResponse {
  config: AdminMobileHooksActionsConfigMappingsResponse;
  updated: string[];
  lastUpdated: string;
}

export interface AdminMobileHooksActionsConfigTestRequest {
  eventType?: string;
  payload?: Record<string, unknown>;
}

export interface AdminMobileHooksActionsConfigTestResponse {
  success: boolean;
  eventType: string;
  payload: Record<string, unknown>;
  mappedActions: string[];
  actionResults: Array<{
    actionType: string;
    enabled: boolean;
    wouldExecute: boolean;
    settings: Record<string, unknown>;
  }>;
  summary: {
    totalActions: number;
    enabledActions: number;
    wouldExecute: number;
  };
  testedAt: string;
}

export interface AdminMobileHooksActionTypeInfo {
  description: string;
  enabled: boolean;
  configured: boolean;
  warnings: string[];
  settings: Record<string, unknown>;
}

export interface AdminMobileHooksActionTypesResponse {
  actions: Record<string, AdminMobileHooksActionTypeInfo>;
}

export type AdminMobileHooksActionTypeSettingsUpdateRequest = Record<string, unknown> & {
  enabled?: boolean;
};

export interface AdminMobileHooksActionTypeSettingsUpdateResponse {
  actionType: string;
  settings: Record<string, unknown>;
  updated: string[];
  lastUpdated: string;
}

export interface AdminMobileHooksActionTypeTestRequest {
  actionType: string;
  dryRun?: boolean;
  testData?: Record<string, unknown>;
}

export interface AdminMobileHooksActionTypeTestResponse {
  actionType: string;
  enabled: boolean;
  dryRun: boolean;
  testPayload: Record<string, unknown>;
  execution: {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
  };
  settings: Record<string, unknown>;
  testedAt: string;
}

export interface AdminMobileHooksEmergencyStatusResponse {
  enabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
}

export interface AdminMobileHooksEmergencyStatusUpdateRequest {
  enabled: boolean;
  reason?: string;
}

export interface AdminMobileHooksEmergencyStatusUpdateResponse {
  enabled: boolean;
  updatedAt: string;
  message: string;
}

export interface AdminMobileHooksHealthChecks {
  settingsLoaded: boolean;
  emergencyEnabled: boolean;
  analyticsActive: boolean;
  errorReportingActive: boolean;
  offlineStorageActive: boolean;
  performanceMonitoringActive: boolean;
}

export interface AdminMobileHooksHealthResponse {
  status: HealthStatus;
  healthScore: number;
  checks?: AdminMobileHooksHealthChecks;
  error?: string;
  timestamp: string;
}

export interface AdminMobileHooksRecentEventActionExecution {
  actionType: string;
  status: 'success' | 'failed' | 'skipped';
  errorMessage: string | null;
  executionTimeMs: number | null;
  executedAt: string;
  details?: Record<string, unknown>;
}

export interface AdminMobileHooksRecentEvent {
  eventId: string;
  eventType: string;
  userId: string | null;
  timestamp: string;
  processingStatus: MobileAnalyticsProcessingStatus;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
  actionExecutions: AdminMobileHooksRecentEventActionExecution[];
}

export interface AdminMobileHooksRecentEventsResponse {
  events: AdminMobileHooksRecentEvent[];
}

export interface AdminHookSummary {
  id: number;
  name: string;
  description?: string;
  eventPattern: string;
  actionType: string;
  actionConfig?: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  lastExecution?: string;
}

export interface AdminHookStats {
  totalHooks: number;
  activeHooks: number;
  executionsToday: number;
  lastReloadedAt?: string;
}

export interface AdminHookExecution {
  id: number;
  hookId: number;
  eventName: string;
  success: boolean;
  executionTimeMs: number;
  errorMessage?: string;
  executedAt: string;
}

export interface AdminHookExecutionResponse {
  executions: AdminHookExecution[];
  total: number;
  page: number;
  pageSize: number;
}

// Re-export shared types used by admin methods
export type { MobileHooksListenerSettings, MobileAnalyticsActionTypeBreakdown };
