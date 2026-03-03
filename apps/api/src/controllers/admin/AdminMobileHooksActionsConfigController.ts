// ================================================================
// src/controllers/admin/AdminMobileHooksActionsConfigController.ts
// Admin hook action configuration endpoints
// manages hook actions/mappings/settings—get/update action mappings, action settings, listener/action lists, tests; no emergency/health logic.
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { AppSettingCreationAttributes } from '../../models/AppSetting';
import { getAuditLogService } from '../../services/AuditLogService';
import { MOBILE_HOOK_SETTING_KEYS, BASE_HOOKS, GLOBAL_SCOPE } from '@my-many-books/shared-types';
import { Op } from 'sequelize';
import { databaseActionTestService } from '../../services/DatabaseActionTestService';
import type { DatabaseExecutionResult } from '../../services/DatabaseActionTestService';
import { emailService } from '../../services/action-tests/EmailService';
import { pushNotificationService } from '../../services/action-tests/PushNotificationService';
import { slackService } from '../../services/action-tests/SlackService';
import { smsService } from '../../services/action-tests/SmsService';
import { webhookService } from '../../services/action-tests/WebhookService';
import type { ActionTestResult } from '../../services/action-tests/ActionTestResult';
import { TABLE_NAMES } from '../../utils/constants';
import { isJsonObject, isJsonValue, type JsonObject } from '../../types/json';

const ACTIONS_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.actions`;
const LISTENERS_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.listeners`;
const CATEGORIES_BASE = `${BASE_HOOKS}.${GLOBAL_SCOPE}.categories`;

// Action types available for mobile hooks
export const ACTION_TYPES = {
  EMAIL: 'email',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  DATABASE: 'database',
  PUSH_NOTIFICATION: 'push_notification',
  SMS: 'sms',
} as const;

const ACTION_DESCRIPTIONS: Record<ActionType, string> = {
  email: 'Send email notifications to configured recipients',
  slack: 'Send messages to Slack channels with optional user mentions',
  webhook: 'Send HTTP POST requests to external webhook endpoints',
  database: 'Store events in database tables for analytics',
  push_notification: 'Send push notifications to mobile devices',
  sms: 'Send SMS messages for critical alerts',
};

type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];
const ACTION_TYPE_VALUES: readonly string[] = Object.values(ACTION_TYPES);

interface HookActionMapping {
  [eventName: string]: ActionType[];
}

type ActionSettings = {
  [ACTION_TYPES.EMAIL]: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    template: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expected_fields: string[];
  };
  [ACTION_TYPES.SLACK]: {
    enabled: boolean;
    channel: string;
    rate_limit_minutes: number;
    mention_users: string[];
    webhook_url?: string;
    expected_fields: string[];
  };
  [ACTION_TYPES.WEBHOOK]: {
    enabled: boolean;
    endpoints: string[];
    rate_limit_minutes: number;
    timeout_seconds: number;
    retry_attempts: number;
    webhook_url?: string;
    expected_fields: string[];
  };
  [ACTION_TYPES.DATABASE]: {
    enabled: boolean;
    table: string;
    batch_size: number;
    retention_days: number;
    expected_fields: string[];
  };
  [ACTION_TYPES.PUSH_NOTIFICATION]: {
    enabled: boolean;
    rate_limit_minutes: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    expected_fields: string[];
  };
  [ACTION_TYPES.SMS]: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    emergency_only: boolean;
    expected_fields: string[];
  };
};

type HookListenerMap = Record<string, { enabled: boolean }>;

interface HookListenersResponse {
  listeners: HookListenerMap;
  categories: HookListenerMap;
  availableEvents: string[];
  lastUpdated: string | null;
}

const AVAILABLE_EVENTS = [
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

interface HookActionConfigResponse {
  actions: HookActionMapping;
  actionSettings: ActionSettings;
  availableEvents: string[];
  lastUpdated: string | null;
}

interface HookActionConfigUpdateRequest {
  actions?: HookActionMapping;
  actionSettings?: Partial<ActionSettings>;
}

type ActionSettingsUpdateRequest = Partial<ActionSettings[ActionType]>;

type HookListenerToggle = boolean | { enabled: boolean };
type HookListenerUpdateMap = Record<string, HookListenerToggle>;

interface HookListenerUpdateRequest {
  listeners?: HookListenerUpdateMap;
  categories?: HookListenerUpdateMap;
  analytics?: boolean;
  errorReporting?: boolean;
  offlineStorage?: boolean;
  performanceMonitoring?: boolean;
}

interface TestConfigRequestBody {
  eventType?: string;
  payload?: JsonObject;
}

interface TestActionTypeRequestBody {
  actionType: ActionType;
  dryRun?: boolean;
  testData?: JsonObject;
}

interface ActionExecutionResult {
  success: boolean;
  message: string;
  details?: ActionExecutionDetails;
}

interface ActionExecutionDetails {
  enabled?: boolean;
  recipientCount?: number;
  endpoints?: number;
  results?: ActionTestResult[];
  channel?: string;
  endpointCount?: number;
  table?: string;
  recipients?: number;
  result?: ActionTestResult | DatabaseExecutionResult | ActionTestResult[];
}

interface ActionTypeDetails {
  description: string;
  enabled: boolean;
  configured: boolean;
  warnings: string[];
  settings: ActionSettings[ActionType];
}

export class AdminMobileHooksActionsConfigController extends BaseController {
  private isActionType(value: string | undefined): value is ActionType {
    return typeof value === 'string' && ACTION_TYPE_VALUES.includes(value);
  }

  private isHookActionMapping(value: unknown): value is HookActionMapping {
    if (!this.isRecord(value)) {
      return false;
    }

    return Object.values(value).every(actions =>
      Array.isArray(actions) && actions.every(action => typeof action === 'string' && this.isActionType(action))
    );
  }

  private isHookActionConfigUpdateRequest(value: unknown): value is HookActionConfigUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['actions'] !== undefined && !this.isHookActionMapping(value['actions'])) {
      return false;
    }

    if (value['actionSettings'] !== undefined && !this.isRecord(value['actionSettings'])) {
      return false;
    }

    return true;
  }

  private isHookListenerUpdateRequest(value: unknown): value is HookListenerUpdateRequest {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['listeners'] !== undefined && !this.isRecord(value['listeners'])) {
      return false;
    }

    if (value['categories'] !== undefined && !this.isRecord(value['categories'])) {
      return false;
    }

    if (value['analytics'] !== undefined && typeof value['analytics'] !== 'boolean') {
      return false;
    }

    if (value['errorReporting'] !== undefined && typeof value['errorReporting'] !== 'boolean') {
      return false;
    }

    if (
      value['offlineStorage'] !== undefined &&
      typeof value['offlineStorage'] !== 'boolean'
    ) {
      return false;
    }

    if (
      value['performanceMonitoring'] !== undefined &&
      typeof value['performanceMonitoring'] !== 'boolean'
    ) {
      return false;
    }

    return true;
  }

  private isTestConfigRequestBody(value: unknown): value is TestConfigRequestBody {
    if (!this.isRecord(value)) {
      return false;
    }

    if (value['eventType'] !== undefined && typeof value['eventType'] !== 'string') {
      return false;
    }

    if (value['payload'] !== undefined && !isJsonObject(value['payload'])) {
      return false;
    }

    return true;
  }

  private isActionSettingsUpdateRequest(value: unknown): value is ActionSettingsUpdateRequest {
    return this.isRecord(value);
  }

  private isTestActionTypeRequestBody(value: unknown): value is TestActionTypeRequestBody {
    if (!this.isRecord(value) || typeof value['actionType'] !== 'string') {
      return false;
    }

    if (value['dryRun'] !== undefined && typeof value['dryRun'] !== 'boolean') {
      return false;
    }

    if (value['testData'] !== undefined && !isJsonObject(value['testData'])) {
      return false;
    }

    return this.isActionType(value['actionType']);
  }

   /**
   * GET /api/admin/mobile-hooks/actions-config/mappings
   * Get current mobile hooks actions mappings:
   * - `actions`: eventType → actionType[] mappings (hook-to-action mapping)
   * - `actionSettings`: per-action-type settings (email/slack/webhook/etc.)
   * - `availableEvents`, `lastUpdated`
   */
  async getActionMappings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const config = await this.loadConfig();
      return this.createSuccessResponse(config);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * PUT /api/admin/mobile-hooks/actions-config/mappings
   * Update mobile hooks actions mappings.
   * Accepts optional:
   * - `actions` (eventType → actionType[] mappings)
   * - `actionSettings` (partial per-action-type settings)
   * Returns updated config + list of updated keys + `lastUpdated`.
   */
  async updateActionMappings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isHookActionConfigUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const oldConfig = await this.loadConfig();
      const updatedSettings: string[] = [];

      // Update action mappings
      if (body.actions) {
        await this.updateConfigSetting(`${ACTIONS_BASE}.mappings`, JSON.stringify(body.actions));
        updatedSettings.push('actions');
      }

      // Update action settings
      if (body.actionSettings) {
        for (const [actionType, settings] of Object.entries(body.actionSettings)) {
          if (!this.isActionType(actionType)) {
            return this.createErrorResponseI18n('errors:validation_failed', 400);
          }

          if (!isJsonObject(settings)) {
            return this.createErrorResponseI18n('errors:validation_failed', 400);
          }

          const key = `${ACTIONS_BASE}.settings.${actionType}`;
          await this.updateConfigSetting(key, JSON.stringify(settings));
          updatedSettings.push(`actionSettings.${actionType}`);
        }
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'UPDATE_HOOK_ACTIONS',
        'mobile_hook_actions',
        'hook_action_config',
        {
          oldConfig,
          newConfig: body,
          changes: updatedSettings,
        }
      );

      const newConfig = await this.loadConfig();

      return this.createSuccessResponse(
        {
          config: newConfig,
          updated: updatedSettings,
          lastUpdated: new Date().toISOString(),
        },
        'Hook action configuration updated successfully'
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

   /**
   * GET /api/admin/mobile-hooks/config/listeners
   * Get hook listeners + categories enablement:
   * - `listeners`: per-event enabled flags
   * - `categories`: per-category enabled flags
   * - `availableEvents`, `lastUpdated`
   */
  async getHookListeners(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const config = await this.loadHookListeners();
      return this.createSuccessResponse(config);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * PUT /api/admin/mobile-hooks/config/listeners
   * Update listener + category enablement (per-event + per-category).
   * Returns list of updated flags + `lastUpdated`.
   */
  async updateHookActionListeners(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isHookListenerUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      if (body.listeners !== undefined) {
        for (const [eventName, toggle] of Object.entries(body.listeners)) {
          const enabled = this.normalizeHookToggle(toggle);

          if (enabled === null) {
            return this.createErrorResponseI18n('errors:invalid_listener_toggle', 400, { event: eventName });
          }

          await this.updateConfigSetting(`${LISTENERS_BASE}.${eventName}.enabled`, String(enabled));
          updatedSettings.push(`listeners.${eventName}`);
        }
      }

      if (body.categories !== undefined) {
        for (const [categoryName, toggle] of Object.entries(body.categories)) {
          const enabled = this.normalizeHookToggle(toggle);

          if (enabled === null) {
            return this.createErrorResponseI18n('errors:validation_failed', 400);
          }

          await this.updateConfigSetting(`${CATEGORIES_BASE}.${categoryName}.enabled`, String(enabled));
          updatedSettings.push(`categories.${categoryName}`);
        }
      }

      if (typeof body.analytics === 'boolean') {
        await this.updateConfigSetting(MOBILE_HOOK_SETTING_KEYS.ANALYTICS_ENABLED, String(body.analytics));
        updatedSettings.push('analytics');
      }

      if (typeof body.errorReporting === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOK_SETTING_KEYS.ERROR_REPORTING_ENABLED,
          String(body.errorReporting)
        );
        updatedSettings.push('errorReporting');
      }

      if (typeof body.performanceMonitoring === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOK_SETTING_KEYS.PERFORMANCE_MONITORING_ENABLED,
          String(body.performanceMonitoring)
        );
        updatedSettings.push('performanceMonitoring');
      }

      return this.createSuccessResponse({
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  private normalizeHookToggle(toggle: unknown): boolean | null {
    if (typeof toggle === 'boolean') {
      return toggle;
    }

    if (this.isRecord(toggle) && typeof toggle['enabled'] === 'boolean') {
      return toggle['enabled'];
    }

    return null;
  }

  private sanitizeActionSettings(
    actionType: ActionType,
    actionSettings: ActionSettings
  ): JsonObject {
    switch (actionType) {
      case ACTION_TYPES.WEBHOOK: {
        const { webhook_url: _webhookUrl, ...sanitized } = actionSettings[ACTION_TYPES.WEBHOOK];
        return sanitized;
      }
      case ACTION_TYPES.SLACK: {
        const slackSettings = actionSettings[ACTION_TYPES.SLACK];
        const { webhook_url: webhookUrl, ...sanitized } = slackSettings;
        return webhookUrl ? { ...sanitized, webhook_url: '***masked***' } : sanitized;
      }
      case ACTION_TYPES.EMAIL:
      case ACTION_TYPES.SMS: {
        const recipientSettings = actionSettings[actionType];
        return {
          ...recipientSettings,
          recipients: recipientSettings.recipients.map(() => '***@***.***'),
        };
      }
      default:
        return { ...actionSettings[actionType] };
    }
  }

  /**
   * POST /api/admin/mobile-hooks/actions-config/test - Test hook configuration
   * Triggers a test event through the hook system to verify configuration works
   */
  async testConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const parsedBody = this.parseBody(request);
    if (parsedBody !== null && !this.isTestConfigRequestBody(parsedBody)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }
    const body: TestConfigRequestBody | null = parsedBody;

    const testEventType = body?.eventType || 'test.hook.config';
    const testPayload: JsonObject = body?.payload || {
      test: true,
      triggeredBy: request.user?.id ?? null,
      timestamp: new Date().toISOString(),
    };

    try {
      const config = await this.loadConfig();

      // Check if the event type has any actions mapped
      const mappedActions = config.actions[testEventType] || [];

      // Simulate action execution without actually sending
      const testResults: Array<{
        actionType: ActionType;
        enabled: boolean;
        wouldExecute: boolean;
        settings: JsonObject;
      }> = [];

      for (const actionType of mappedActions) {
        const actionSettings = config.actionSettings[actionType];
        const settings = this.sanitizeActionSettings(actionType, config.actionSettings);

        testResults.push({
          actionType,
          enabled: actionSettings?.enabled ?? false,
          wouldExecute: actionSettings?.enabled ?? false,
          settings,
        });
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'TEST_HOOK_CONFIG',
        'mobile_hook_actions',
        'hook_action_test',
        { eventType: testEventType, actionsChecked: mappedActions.length }
      );

      return this.createSuccessResponse({
        success: true,
        eventType: testEventType,
        payload: testPayload,
        mappedActions: mappedActions,
        actionResults: testResults,
        summary: {
          totalActions: mappedActions.length,
          enabledActions: testResults.filter(r => r.enabled).length,
          wouldExecute: testResults.filter(r => r.wouldExecute).length,
        },
        testedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * GET /api/admin/mobile-hooks/actions - Get action configurations
   */
  async getActionTypes(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const config = await this.loadConfig();
    const buildActionDetails = (actionType: ActionType): ActionTypeDetails => {
      const settings = config.actionSettings[actionType];
      const warnings = this.getActionWarnings(settings);

      return {
        description: ACTION_DESCRIPTIONS[actionType],
        enabled: settings.enabled,
        configured: warnings.length === 0,
        warnings,
        settings,
      };
    };

    const actions: Record<ActionType, ActionTypeDetails> = {
      [ACTION_TYPES.EMAIL]: buildActionDetails(ACTION_TYPES.EMAIL),
      [ACTION_TYPES.SLACK]: buildActionDetails(ACTION_TYPES.SLACK),
      [ACTION_TYPES.WEBHOOK]: buildActionDetails(ACTION_TYPES.WEBHOOK),
      [ACTION_TYPES.DATABASE]: buildActionDetails(ACTION_TYPES.DATABASE),
      [ACTION_TYPES.PUSH_NOTIFICATION]: buildActionDetails(ACTION_TYPES.PUSH_NOTIFICATION),
      [ACTION_TYPES.SMS]: buildActionDetails(ACTION_TYPES.SMS),
    };

    return this.createSuccessResponse({ actions });
  }

  /**
   * PUT /api/admin/mobile-hooks/actions/{action_type} - Update action settings
   */
  async updateActionTypeSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const actionTypeParam = request.params?.['action_type'];
    if (!this.isActionType(actionTypeParam)) {
      return this.createErrorResponseI18n('errors:invalid_action_type', 400);
    }
    const actionType = actionTypeParam;

    const body = this.parseBody(request);
    if (!this.isActionSettingsUpdateRequest(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      // Get current settings for this action type
      const currentConfig = await this.loadConfig();
      const currentSettings = currentConfig.actionSettings[actionType];
      let updatedSettings: ActionSettings[ActionType];
      let nextActionSettings: ActionSettings;

      switch (actionType) {
        case ACTION_TYPES.EMAIL: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.EMAIL] = {
            ...currentConfig.actionSettings[ACTION_TYPES.EMAIL],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = { ...currentConfig.actionSettings, [ACTION_TYPES.EMAIL]: mergedSettings };
          break;
        }
        case ACTION_TYPES.SLACK: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.SLACK] = {
            ...currentConfig.actionSettings[ACTION_TYPES.SLACK],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = { ...currentConfig.actionSettings, [ACTION_TYPES.SLACK]: mergedSettings };
          break;
        }
        case ACTION_TYPES.WEBHOOK: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.WEBHOOK] = {
            ...currentConfig.actionSettings[ACTION_TYPES.WEBHOOK],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = { ...currentConfig.actionSettings, [ACTION_TYPES.WEBHOOK]: mergedSettings };
          break;
        }
        case ACTION_TYPES.DATABASE: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.DATABASE] = {
            ...currentConfig.actionSettings[ACTION_TYPES.DATABASE],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = { ...currentConfig.actionSettings, [ACTION_TYPES.DATABASE]: mergedSettings };
          break;
        }
        case ACTION_TYPES.PUSH_NOTIFICATION: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.PUSH_NOTIFICATION] = {
            ...currentConfig.actionSettings[ACTION_TYPES.PUSH_NOTIFICATION],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = {
            ...currentConfig.actionSettings,
            [ACTION_TYPES.PUSH_NOTIFICATION]: mergedSettings,
          };
          break;
        }
        case ACTION_TYPES.SMS: {
          const mergedSettings: ActionSettings[typeof ACTION_TYPES.SMS] = {
            ...currentConfig.actionSettings[ACTION_TYPES.SMS],
            ...body,
          };
          updatedSettings = mergedSettings;
          nextActionSettings = { ...currentConfig.actionSettings, [ACTION_TYPES.SMS]: mergedSettings };
          break;
        }
        default: {
          actionType satisfies never;
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
      }

      // Validate settings based on action type
      const validationError = this.validateActionSettings(actionType, nextActionSettings);
      if (validationError) {
        return validationError;
      }

      // Update the settings
      const key = `${ACTIONS_BASE}.settings.${actionType}`;
      await this.updateConfigSetting(key, JSON.stringify(updatedSettings));

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'UPDATE_actionSettings',
        'mobile_hook_action_settings',
        actionType,
        {
          oldSettings: currentSettings,
          newSettings: updatedSettings,
          actionType,
        }
      );

      return this.createSuccessResponse(
        {
          action_type: actionType,
          settings: nextActionSettings[actionType],
          updated: Object.keys(body),
          lastUpdated: new Date().toISOString(),
        },
        `${actionType} action settings updated successfully`
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * POST /api/admin/mobile-hooks/actions/test - Test action execution
   * Tests a specific action type with sample data to verify it's configured correctly
   */
  async testActionType(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody(request);
    if (!this.isTestActionTypeRequestBody(body)) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    const { actionType, dryRun = true, testData = {} } = body;

    try {
      const config = await this.loadConfig();
      const actionSettings = config.actionSettings[actionType];

      if (!actionSettings) {
        return this.createErrorResponseI18n('errors:not_found', 404);
      }

      const testPayload: JsonObject = {
        eventType: 'test.action.execution',
        message: `Test ${actionType} action triggered by admin`,
        triggeredBy: request.user?.id ?? null,
        timestamp: new Date().toISOString(),
        ...testData,
      };

      let executionResult: ActionExecutionResult;

      if (dryRun) {
        // Dry run - validate configuration without executing
        executionResult = this.validateActionExecution(actionType, config.actionSettings);
      } else {
        // Actually execute the test action
        executionResult = await this.executeTestAction(
          actionType,
          config.actionSettings,
          testPayload
        );
      }

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'TEST_ACTION_EXECUTION',
        'mobile_hook_action_settings',
        actionType,
        {
          actionType,
          dryRun,
          success: executionResult.success,
        }
      );

      const sanitizedSettings = this.sanitizeActionSettings(actionType, config.actionSettings);

      return this.createSuccessResponse({
        actionType,
        enabled: actionSettings.enabled,
        dryRun,
        testPayload,
        execution: executionResult,
        settings: sanitizedSettings,
        testedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponseI18n('errors:internal_error', 500);
    }
  }

  /**
   * Validate action execution without actually executing
   */
  private validateActionExecution(
    actionType: ActionType,
    settings: ActionSettings
  ): ActionExecutionResult {
    const currentSettings = settings[actionType];
    if (!currentSettings.enabled) {
      return {
        success: false,
        message: `${actionType} action is disabled`,
        details: { enabled: false },
      };
    }

    switch (actionType) {
      case ACTION_TYPES.EMAIL:
        if (settings[ACTION_TYPES.EMAIL].recipients.length === 0) {
          return {
            success: false,
            message: 'No email recipients configured',
            details: { recipientCount: 0 },
          };
        }
        return {
          success: true,
          message: 'Email configuration is valid',
          details: { recipientCount: settings[ACTION_TYPES.EMAIL].recipients.length },
        };

      case ACTION_TYPES.SLACK:
        if (!settings[ACTION_TYPES.SLACK].channel) {
          return {
            success: false,
            message: 'No Slack channel configured',
          };
        }
        return {
          success: true,
          message: 'Slack configuration is valid',
          details: { channel: settings[ACTION_TYPES.SLACK].channel },
        };

      case ACTION_TYPES.WEBHOOK:
        if (settings[ACTION_TYPES.WEBHOOK].endpoints.length === 0) {
          return {
            success: false,
            message: 'No webhook endpoints configured',
            details: { endpointCount: 0 },
          };
        }
        return {
          success: true,
          message: 'Webhook configuration is valid',
          details: { endpointCount: settings[ACTION_TYPES.WEBHOOK].endpoints.length },
        };

      case ACTION_TYPES.DATABASE:
        if (!settings[ACTION_TYPES.DATABASE].table) {
          return {
            success: false,
            message: 'No database table configured',
          };
        }
        return {
          success: true,
          message: 'Database configuration is valid',
          details: { table: settings[ACTION_TYPES.DATABASE].table },
        };

      case ACTION_TYPES.PUSH_NOTIFICATION:
        return {
          success: true,
          message: 'Push notification configuration is valid',
        };

      case ACTION_TYPES.SMS:
        if (settings[ACTION_TYPES.SMS].recipients.length === 0) {
          return {
            success: false,
            message: 'No SMS recipients configured',
            details: { recipientCount: 0 },
          };
        }
        return {
          success: true,
          message: 'SMS configuration is valid',
          details: { recipientCount: settings[ACTION_TYPES.SMS].recipients.length },
        };

      default:
        // Exhaustive guard for future action types
        actionType satisfies never;
        return {
          success: false,
          message: 'Unknown action type',
        };
    }
  }

  /**
   * Execute a test action (non-dry-run)
   */
  private async executeTestAction(
    actionType: ActionType,
    settings: ActionSettings,
    testPayload: JsonObject
  ): Promise<ActionExecutionResult> {
    // First validate
    const validation = this.validateActionExecution(actionType, settings);
    if (!validation.success) {
      return validation;
    }

    // For now, return simulated success
    // In production, this would actually send emails, Slack messages, etc.
    switch (actionType) {
      case ACTION_TYPES.EMAIL: {
        const emailSettings = settings[ACTION_TYPES.EMAIL];
        const emailEndpoint = process.env['EMAIL_TEST_ENDPOINT'];
        if (!emailEndpoint) {
          return {
            success: false,
            message: 'Email test endpoint is not configured',
          };
        }

        const emailResult = await emailService.sendTestEmail(
          emailEndpoint,
          emailSettings.recipients,
          `[TEST] ${emailSettings.template || 'Mobile Hook Alert'}`,
          testPayload
        );

        return {
          success: emailResult.success,
          message: emailResult.success ? 'Email test executed successfully' : 'Email test failed',
          details: {
            recipients: emailSettings.recipients.length,
            result: emailResult,
          },
        };
      }

      case ACTION_TYPES.SLACK: {
        const slackSettings = settings[ACTION_TYPES.SLACK];
        if (!slackSettings.webhook_url) {
          return {
            success: false,
            message: 'Slack webhook URL is missing',
          };
        }

        const slackResult = await slackService.postTestMessage(
          slackSettings.webhook_url,
          testPayload
        );

        return {
          success: slackResult.success,
          message: slackResult.success
            ? 'Slack webhook test executed successfully'
            : 'Slack webhook test failed',
          details: {
            channel: slackSettings.channel,
            result: slackResult,
          },
        };
      }

      case ACTION_TYPES.WEBHOOK: {
        const webhookSettings = settings[ACTION_TYPES.WEBHOOK];
        const webhookResults = await webhookService.executeTestEndpoints(
          webhookSettings.endpoints,
          testPayload
        );
        const webhookSuccess = webhookResults.every(result => result.success);

        return {
          success: webhookSuccess,
          message: webhookSuccess
            ? 'Webhook test executed successfully'
            : 'One or more webhook endpoints failed',
          details: {
            endpoints: webhookSettings.endpoints.length,
            results: webhookResults,
          },
        };
      }

      case ACTION_TYPES.DATABASE: {
        const dbSettings = settings[ACTION_TYPES.DATABASE];
        const tableName = dbSettings.table;
        const dbResult = await databaseActionTestService.insertTestRecord(tableName, testPayload);

        return {
          success: dbResult.success,
          message: dbResult.success
            ? 'Database test record inserted successfully'
            : 'Database test record insertion failed',
          details: {
            table: tableName,
            result: dbResult,
          },
        };
      }

      case ACTION_TYPES.PUSH_NOTIFICATION: {
        const pushEndpoint = process.env['PUSH_NOTIFICATION_TEST_ENDPOINT'];
        if (!pushEndpoint) {
          return {
            success: false,
            message: 'Push notification test endpoint is not configured',
          };
        }

        const pushResult = await pushNotificationService.sendTestNotification(pushEndpoint, testPayload);
        return {
          success: pushResult.success,
          message: pushResult.success
            ? 'Push notification test executed successfully'
            : 'Push notification test failed',
          details: {
            result: pushResult,
          },
        };
      }

      case ACTION_TYPES.SMS: {
        const smsSettings = settings[ACTION_TYPES.SMS];
        const smsEndpoint = process.env['SMS_TEST_ENDPOINT'];
        if (!smsEndpoint) {
          return {
            success: false,
            message: 'SMS test endpoint is not configured',
          };
        }

        const smsResult = await smsService.sendTestSms(
          smsEndpoint,
          smsSettings.recipients,
          JSON.stringify(testPayload)
        );

        return {
          success: smsResult.success,
          message: smsResult.success
            ? 'SMS test executed successfully'
            : 'SMS test failed',
          details: {
            recipients: smsSettings.recipients.length,
            result: smsResult,
          },
        };
      }

      default:
        // Exhaustive guard for future action types
        actionType satisfies never;
        return {
          success: false,
          message: 'Execution not implemented for action type',
        };
    }
  }

  /**
   * Load hook action configuration from database
   */
  private async loadConfig(): Promise<HookActionConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          [Op.like]: `${ACTIONS_BASE}.%`,
        },
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Load action mappings
    const actionMappingsStr = settingsMap.get(`${ACTIONS_BASE}.mappings`);
    let actions: HookActionMapping = {};
    if (actionMappingsStr) {
      try {
        const parsedMappings: unknown = JSON.parse(actionMappingsStr);
        actions = this.isHookActionMapping(parsedMappings)
          ? parsedMappings
          : this.getDefaultActionMappings();
      } catch {
        actions = this.getDefaultActionMappings();
      }
    } else {
      actions = this.getDefaultActionMappings();
    }

    // Load action settings
    const actionSettings: ActionSettings = this.getDefaultActionSettings();
    for (const actionType of Object.values(ACTION_TYPES)) {
      const settingsStr = settingsMap.get(`${ACTIONS_BASE}.settings.${actionType}`);
      if (settingsStr) {
        try {
          const parsedSettings: unknown = JSON.parse(settingsStr);
          if (isJsonObject(parsedSettings)) {
            Object.assign(actionSettings[actionType], parsedSettings);
          }
        } catch {
          // Keep default settings on parse error
        }
      }
    }

    // Get available events (simplified list)
    const availableEvents = [
      'error.unhandled',
      'error.promise_rejection',
      'app.startup',
      'app.termination',
      'app.memory_warning',
      'network.offline',
      'network.timeout',
      'sync.failed',
      'performance.slow',
    ];

    // Find last updated timestamp
    const lastUpdatedSetting = await AppSetting.findOne({
      where: {
        key: {
          [Op.like]: `${ACTIONS_BASE}.%`,
        },
      },
      order: [['updateDate', 'DESC']],
    });

    return {
      actions,
      actionSettings: actionSettings,
      availableEvents: availableEvents,
      lastUpdated: lastUpdatedSetting?.updateDate?.toISOString() || null,
    };
  }

  /**
   * Load hook listeners from database
   */
  private async loadHookListeners(): Promise<HookListenersResponse> {
    const listenerSettings = await AppSetting.findAll({
      where: { key: { [Op.like]: `${LISTENERS_BASE}.%` } },
    });
    const categorySettings = await AppSetting.findAll({
      where: { key: { [Op.like]: `${CATEGORIES_BASE}.%` } },
    });

    const listenerMap = new Map(listenerSettings.map(s => [s.key, s.value]));
    const categoryMap = new Map(categorySettings.map(s => [s.key, s.value]));

    const defaultListeners: HookListenerMap = {
      'error.unhandled': { enabled: true },
      'error.promise_rejection': { enabled: true },
      'app.startup': { enabled: true },
      'app.termination': { enabled: true },
      'network.offline': { enabled: true },
      'network.online': { enabled: true },
      'sync.complete': { enabled: true },
      'sync.failed': { enabled: false },
    };

    const listeners: HookListenerMap = { ...defaultListeners };
    for (const [key, value] of listenerMap.entries()) {
      const name = key.replace(`${LISTENERS_BASE}.`, '').replace('.enabled', '');
      listeners[name] = { enabled: value !== 'false' };
    }

    const defaultCategories: HookListenerMap = {
      error_listeners: { enabled: true },
      analytics_listeners: { enabled: true },
      performance_listeners: { enabled: true },
      user_behavior_listeners: { enabled: true },
    };

    const categories: HookListenerMap = { ...defaultCategories };
    for (const [key, value] of categoryMap.entries()) {
      const name = key.replace(`${CATEGORIES_BASE}.`, '').replace('.enabled', '');
      categories[name] = { enabled: value !== 'false' };
    }

    const lastListenerUpdate = await AppSetting.findOne({
      where: { key: { [Op.like]: `${LISTENERS_BASE}.%` } },
      order: [['updateDate', 'DESC']],
    });
    const lastCategoryUpdate = await AppSetting.findOne({
      where: { key: { [Op.like]: `${CATEGORIES_BASE}.%` } },
      order: [['updateDate', 'DESC']],
    });
    const latestUpdate = [lastListenerUpdate, lastCategoryUpdate]
      .map(s => s?.updateDate?.getTime() || 0)
      .reduce((a, b) => Math.max(a, b), 0);

    return {
      listeners,
      categories,
      availableEvents: [...AVAILABLE_EVENTS],
      lastUpdated: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    };
  }

  /**
   * Get default action mappings
   */
  private getDefaultActionMappings(): HookActionMapping {
    return {
      'error.unhandled': [ACTION_TYPES.EMAIL, ACTION_TYPES.SLACK, ACTION_TYPES.DATABASE],
      'error.promise_rejection': [ACTION_TYPES.EMAIL, ACTION_TYPES.DATABASE],
      'app.termination': [ACTION_TYPES.DATABASE],
      'app.memory_warning': [ACTION_TYPES.EMAIL, ACTION_TYPES.SLACK],
      'network.offline': [ACTION_TYPES.DATABASE],
      'sync.failed': [ACTION_TYPES.EMAIL, ACTION_TYPES.DATABASE],
    };
  }

  /**
   * Get default action settings
   */
  private getDefaultActionSettings(): ActionSettings {
    return {
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
    };
  }

  /**
   * Validate action settings and generate warnings, based on the "expected_fields" field value
   */
  private getActionWarnings(
    settings: ActionSettings[ActionType]
  ): string[] {
    const warnings: string[] = [];
    const expectedFields = settings.expected_fields || [];
    const settingsEntries = Object.entries(settings);

    for (const field of expectedFields) {
      const rawValue = settingsEntries.find(([key]) => key === field)?.[1];
      const value = isJsonValue(rawValue) ? rawValue : undefined;

      // Check empty array
      if (Array.isArray(value) && value.length === 0) {
        warnings.push(`No ${field} configured`);
      }
      // Check empty string
      else if (typeof value === 'string' && value.trim() === '') {
        warnings.push(`No ${field} configured`);
      }
      // Check null/undefined
      else if (value === null || value === undefined) {
        warnings.push(`Missing ${field}`);
      }
    }

    return warnings;
  }

  /**
   * Validate action settings based on action type
   */
  private validateActionSettings(actionType: ActionType, settings: ActionSettings): ApiResponse | null {
    switch (actionType) {
      case ACTION_TYPES.EMAIL: {
        const emailSettings = settings[ACTION_TYPES.EMAIL];
        if (emailSettings.recipients && !Array.isArray(emailSettings.recipients)) {
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
        if (
          emailSettings.rate_limit_minutes &&
          (emailSettings.rate_limit_minutes < 1 || emailSettings.rate_limit_minutes > 1440)
        ) {
          return this.createErrorResponseI18n('errors:email_rate_limit_invalid', 400, { min: 1, max: 1440 });
        }
        break;
      }
      case ACTION_TYPES.WEBHOOK: {
        const webhookSettings = settings[ACTION_TYPES.WEBHOOK];
        if (webhookSettings.endpoints && !Array.isArray(webhookSettings.endpoints)) {
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
        if (
          webhookSettings.timeout_seconds &&
          (webhookSettings.timeout_seconds < 1 || webhookSettings.timeout_seconds > 60)
        ) {
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
        break;
      }
      case ACTION_TYPES.DATABASE: {
        const dbSettings = settings[ACTION_TYPES.DATABASE];
        if (dbSettings.batch_size && (dbSettings.batch_size < 1 || dbSettings.batch_size > 1000)) {
          return this.createErrorResponseI18n('errors:validation_failed', 400);
        }
        break;
      }
    }
    return null;
  }

  /**
   * Update a single configuration setting
   */
  private async updateConfigSetting(key: string, value: string): Promise<void> {
    const defaults: AppSettingCreationAttributes = {
      key,
      value,
      active: true,
      category: 'mobile_hooks',
      type: 'string',
      defaultValue: value,
      description: `Mobile hook action configuration: ${key}`,
      deleted: false,
    };

    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }
}

export const adminMobileHooksActionsConfigController = new AdminMobileHooksActionsConfigController();
