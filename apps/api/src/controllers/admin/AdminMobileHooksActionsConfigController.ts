// ================================================================
// src/controllers/admin/AdminMobileHooksActionsConfigController.ts
// Admin hook action configuration endpoints
// manages hook actions/mappings/settings—get/update action mappings, action settings, listener/action lists, tests; no emergency/health logic.
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { getAuditLogService } from '../../services/AuditLogService';
import { MOBILE_HOOK_SETTING_KEYS } from '@my-many-books/shared-types';
import { Op } from 'sequelize';
import { emailService } from '../../services/EmailService';
import { slackService } from '../../services/SlackService';
import { webhookService } from '../../services/WebhookService';

const ACTIONS_BASE = 'mobile.hooks.actions';
const LISTENERS_BASE = 'mobile.hooks.listeners';
const CATEGORIES_BASE = 'mobile.hooks.categories';

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

interface ActionSettingsUpdateRequest {
  enabled?: boolean;
  [key: string]: any;
}

interface HookListenerUpdateRequest {
  listeners?: Record<string, unknown>;
  categories?: Record<string, unknown>;
  analytics?: boolean;
  errorReporting?: boolean;
  offlineStorage?: boolean;
  performanceMonitoring?: boolean;
}

export class AdminMobileHooksActionsConfigController extends BaseController {
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
      return this.createErrorResponse('Failed to fetch hook action configuration', 500);
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

    const body = this.parseBody<HookActionConfigUpdateRequest>(request);
    if (!body) {
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
      return this.createErrorResponse('Failed to update hook action configuration', 500);
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
      return this.createErrorResponse('Failed to fetch hook listeners', 500);
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

    const body = this.parseBody<HookListenerUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const updatedSettings: string[] = [];

      if (body.listeners !== undefined) {
        if (!body.listeners || typeof body.listeners !== 'object' || Array.isArray(body.listeners)) {
          return this.createErrorResponse('Invalid listeners payload', 400);
        }

        for (const [eventName, toggle] of Object.entries(body.listeners)) {
          let enabled: boolean | null = null;

          if (typeof toggle === 'boolean') {
            enabled = toggle;
          } else if (
            toggle &&
            typeof toggle === 'object' &&
            typeof (toggle as { enabled?: unknown }).enabled === 'boolean'
          ) {
            enabled = (toggle as { enabled: boolean }).enabled;
          }

          if (enabled === null) {
            return this.createErrorResponse(`Invalid listener toggle for: ${eventName}`, 400);
          }

          await this.updateConfigSetting(`${LISTENERS_BASE}.${eventName}.enabled`, String(enabled));
          updatedSettings.push(`listeners.${eventName}`);
        }
      }

      if (body.categories !== undefined) {
        if (!body.categories || typeof body.categories !== 'object' || Array.isArray(body.categories)) {
          return this.createErrorResponse('Invalid categories payload', 400);
        }

        for (const [categoryName, toggle] of Object.entries(body.categories)) {
          let enabled: boolean | null = null;

          if (typeof toggle === 'boolean') {
            enabled = toggle;
          } else if (
            toggle &&
            typeof toggle === 'object' &&
            typeof (toggle as { enabled?: unknown }).enabled === 'boolean'
          ) {
            enabled = (toggle as { enabled: boolean }).enabled;
          }

          if (enabled === null) {
            return this.createErrorResponse(`Invalid category toggle for: ${categoryName}`, 400);
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

      if (typeof body.offlineStorage === 'boolean') {
        await this.updateConfigSetting(
          MOBILE_HOOK_SETTING_KEYS.OFFLINE_STORAGE_ENABLED,
          String(body.offlineStorage)
        );
        updatedSettings.push('offlineStorage');
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
      return this.createErrorResponse('Failed to update hook action configuration', 500);
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

    const body = this.parseBody<{ eventType?: string; payload?: Record<string, unknown> }>(request);

    const testEventType = body?.eventType || 'test.hook.config';
    const testPayload = body?.payload || {
      test: true,
      triggeredBy: request.user?.id,
      timestamp: new Date().toISOString(),
    };

    try {
      const config = await this.loadConfig();

      // Check if the event type has any actions mapped
      const mappedActions = config.actions[testEventType] || [];

      // Simulate action execution without actually sending
      const testResults: Array<{
        actionType: string;
        enabled: boolean;
        wouldExecute: boolean;
        settings: Record<string, unknown>;
      }> = [];

      for (const actionType of mappedActions) {
        const actionSettings = config.actionSettings[actionType] as ActionSettings[ActionType];
        let settings: Record<string, unknown> = { ...actionSettings };

        switch (actionType) {
          case ACTION_TYPES.WEBHOOK:
            settings = { ...(actionSettings as ActionSettings[typeof ACTION_TYPES.WEBHOOK]), webhook_url: undefined };
            break;
          case ACTION_TYPES.SLACK:
            settings = {
              ...(actionSettings as ActionSettings[typeof ACTION_TYPES.SLACK]),
              webhook_url: (actionSettings as ActionSettings[typeof ACTION_TYPES.SLACK]).webhook_url ? '***masked***' : undefined,
            };
            break;
          case ACTION_TYPES.EMAIL:
          case ACTION_TYPES.SMS:
            settings = {
              ...(actionSettings as ActionSettings[typeof ACTION_TYPES.EMAIL]),
              recipients: (actionSettings as ActionSettings[typeof ACTION_TYPES.EMAIL]).recipients.map(() => '***@***.***'),
            };
            break;
          default:
            break;
        }

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
      return this.createErrorResponse('Failed to test hook configuration', 500);
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
    const actions: Record<string, unknown> = {};

    for (const actionType of Object.values(ACTION_TYPES)) {
      const settings = config.actionSettings[actionType];
      const warnings = this.getActionWarnings(settings);

      actions[actionType] = {
        description: ACTION_DESCRIPTIONS[actionType],
        enabled: settings.enabled,
        configured: warnings.length === 0,
        warnings,
        settings,
      };
    }

    return this.createSuccessResponse({ actions });
  }

  /**
   * PUT /api/admin/mobile-hooks/actions/{action_type} - Update action settings
   */
  async updateActionTypeSettings(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const actionType = request.params?.['action_type'] as ActionType;
    if (!actionType || !Object.values(ACTION_TYPES).includes(actionType)) {
      return this.createErrorResponse('Invalid action type', 400);
    }

    const body = this.parseBody<ActionSettingsUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      // Get current settings for this action type
      const currentConfig = await this.loadConfig();
      const currentSettings = currentConfig.actionSettings[actionType];

      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...body };

      // Validate settings based on action type
      const validationError = this.validateActionSettings(actionType, updatedSettings);
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
          settings: updatedSettings,
          updated: Object.keys(body),
          lastUpdated: new Date().toISOString(),
        },
        `${actionType} action settings updated successfully`
      );
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(`Failed to update ${actionType} action settings`, 500);
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

    const body = this.parseBody<{
      actionType: ActionType;
      dryRun?: boolean;
      testData?: Record<string, unknown>;
    }>(request);

    if (!body?.actionType || !Object.values(ACTION_TYPES).includes(body.actionType)) {
      return this.createErrorResponse('Invalid or missing actionType', 400);
    }

    const { actionType, dryRun = true, testData = {} } = body;

    try {
      const config = await this.loadConfig();
      const actionSettings = config.actionSettings[actionType] as ActionSettings[ActionType];

      if (!actionSettings) {
        return this.createErrorResponse(`No settings found for action type: ${actionType}`, 404);
      }

      const testPayload = {
        eventType: 'test.action.execution',
        message: `Test ${actionType} action triggered by admin`,
        triggeredBy: request.user?.id,
        timestamp: new Date().toISOString(),
        ...testData,
      };

      let executionResult: {
        success: boolean;
        message: string;
        details?: Record<string, unknown>;
      };

      if (dryRun) {
        // Dry run - validate configuration without executing
        executionResult = this.validateActionExecution(actionType, actionSettings);
      } else {
        // Actually execute the test action
      executionResult = await this.executeTestAction(actionType, actionSettings, testPayload);
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

      let sanitizedSettings: Record<string, unknown> = { ...actionSettings };

      switch (actionType) {
        case ACTION_TYPES.WEBHOOK:
          sanitizedSettings = {
            ...(actionSettings as ActionSettings[typeof ACTION_TYPES.WEBHOOK]),
            webhook_url: undefined,
          };
          break;
        case ACTION_TYPES.SLACK:
          sanitizedSettings = {
            ...(actionSettings as ActionSettings[typeof ACTION_TYPES.SLACK]),
            webhook_url: (actionSettings as ActionSettings[typeof ACTION_TYPES.SLACK]).webhook_url
              ? '***masked***'
              : undefined,
          };
          break;
        case ACTION_TYPES.EMAIL:
        case ACTION_TYPES.SMS:
          sanitizedSettings = {
            ...(actionSettings as ActionSettings[typeof ACTION_TYPES.EMAIL]),
            recipients: (actionSettings as ActionSettings[typeof ACTION_TYPES.EMAIL]).recipients.map(() => '***@***.***'),
          };
          break;
        default:
          break;
      }

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
      return this.createErrorResponse(`Failed to test ${body.actionType} action`, 500);
    }
  }

  /**
   * Validate action execution without actually executing
   */
  private validateActionExecution<T extends ActionType>(
    actionType: T,
    settings: ActionSettings[T]
  ): { success: boolean; message: string; details?: Record<string, unknown> } {
    if (!settings.enabled) {
      return {
        success: false,
        message: `${actionType} action is disabled`,
        details: { enabled: false },
      };
    }

    switch (actionType) {
      case ACTION_TYPES.EMAIL:
        if (!(settings as ActionSettings[typeof ACTION_TYPES.EMAIL]).recipients || (settings as ActionSettings[typeof ACTION_TYPES.EMAIL]).recipients.length === 0) {
          return {
            success: false,
            message: 'No email recipients configured',
            details: { recipientCount: 0 },
          };
        }
        return {
          success: true,
          message: 'Email configuration is valid',
          details: { recipientCount: (settings as ActionSettings[typeof ACTION_TYPES.EMAIL]).recipients.length },
        };

      case ACTION_TYPES.SLACK:
        if (!(settings as ActionSettings[typeof ACTION_TYPES.SLACK]).channel) {
          return {
            success: false,
            message: 'No Slack channel configured',
          };
        }
        return {
          success: true,
          message: 'Slack configuration is valid',
          details: { channel: (settings as ActionSettings[typeof ACTION_TYPES.SLACK]).channel },
        };

      case ACTION_TYPES.WEBHOOK:
        if (!(settings as ActionSettings[typeof ACTION_TYPES.WEBHOOK]).endpoints || (settings as ActionSettings[typeof ACTION_TYPES.WEBHOOK]).endpoints.length === 0) {
          return {
            success: false,
            message: 'No webhook endpoints configured',
            details: { endpointCount: 0 },
          };
        }
        return {
          success: true,
          message: 'Webhook configuration is valid',
          details: { endpointCount: (settings as ActionSettings[typeof ACTION_TYPES.WEBHOOK]).endpoints.length },
        };

      case ACTION_TYPES.DATABASE:
        if (!(settings as ActionSettings[typeof ACTION_TYPES.DATABASE]).table) {
          return {
            success: false,
            message: 'No database table configured',
          };
        }
        return {
          success: true,
          message: 'Database configuration is valid',
          details: { table: (settings as ActionSettings[typeof ACTION_TYPES.DATABASE]).table },
        };

      case ACTION_TYPES.PUSH_NOTIFICATION:
        return {
          success: true,
          message: 'Push notification configuration is valid',
        };

      case ACTION_TYPES.SMS:
        if (!(settings as ActionSettings[typeof ACTION_TYPES.SMS]).recipients || (settings as ActionSettings[typeof ACTION_TYPES.SMS]).recipients.length === 0) {
          return {
            success: false,
            message: 'No SMS recipients configured',
            details: { recipientCount: 0 },
          };
        }
        return {
          success: true,
          message: 'SMS configuration is valid',
          details: { recipientCount: (settings as ActionSettings[typeof ACTION_TYPES.SMS]).recipients.length },
        };

      default:
        return {
          success: false,
          message: `Unknown action type: ${actionType}`,
        };
    }
  }

  /**
   * Execute a test action (non-dry-run)
   */
  private async executeTestAction<T extends ActionType>(
    actionType: T,
    settings: ActionSettings[T],
    testPayload: Record<string, unknown>
  ): Promise<{ success: boolean; message: string; details?: Record<string, unknown> }> {
    // First validate
    const validation = this.validateActionExecution(actionType, settings);
    if (!validation.success) {
      return validation;
    }

    // For now, return simulated success
    // In production, this would actually send emails, Slack messages, etc.
    switch (actionType) {
      case ACTION_TYPES.EMAIL:
        const emailSettings = settings as ActionSettings[typeof ACTION_TYPES.EMAIL];
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

      case ACTION_TYPES.SLACK:
        const slackSettings = settings as ActionSettings[typeof ACTION_TYPES.SLACK];
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

      case ACTION_TYPES.WEBHOOK:
        const webhookSettings = settings as ActionSettings[typeof ACTION_TYPES.WEBHOOK];
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

      case ACTION_TYPES.DATABASE:
        // TODO: Insert test record
        return {
          success: true,
          message: 'Test database record would be inserted (not implemented)',
          details: {
            table: (settings as ActionSettings[typeof ACTION_TYPES.DATABASE]).table,
          },
        };

      case ACTION_TYPES.PUSH_NOTIFICATION:
        return {
          success: true,
          message: 'Test push notification would be sent (not implemented)',
        };

      case ACTION_TYPES.SMS:
        return {
          success: true,
          message: 'Test SMS would be sent (not implemented)',
          details: {
            recipients: (settings as ActionSettings[typeof ACTION_TYPES.SMS]).recipients.length,
          },
        };

      default:
        return {
          success: false,
          message: `Execution not implemented for action type: ${actionType}`,
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
          $like: `${ACTIONS_BASE}.%`,
        } as any,
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Load action mappings
    const actionMappingsStr = settingsMap.get(`${ACTIONS_BASE}.mappings`);
    let actions: HookActionMapping = {};
    if (actionMappingsStr) {
      try {
        actions = JSON.parse(actionMappingsStr);
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
          const parsedSettings = JSON.parse(settingsStr);
          actionSettings[actionType] = { ...actionSettings[actionType], ...parsedSettings };
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
          $like: `${ACTIONS_BASE}.%`,
        } as any,
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
        table: 'mobile_analytics',
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

    for (const field of expectedFields) {
      const value = (settings as Record<string, unknown>)[field];

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
  private validateActionSettings(actionType: ActionType, settings: any): ApiResponse | null {
    switch (actionType) {
      case ACTION_TYPES.EMAIL:
        if (settings.recipients && !Array.isArray(settings.recipients)) {
          return this.createErrorResponse('Email recipients must be an array', 400);
        }
        if (
          settings.rate_limit_minutes &&
          (settings.rate_limit_minutes < 1 || settings.rate_limit_minutes > 1440)
        ) {
          return this.createErrorResponse(
            'Email rate limit must be between 1 and 1440 minutes',
            400
          );
        }
        break;
      case ACTION_TYPES.WEBHOOK:
        if (settings.endpoints && !Array.isArray(settings.endpoints)) {
          return this.createErrorResponse('Webhook endpoints must be an array', 400);
        }
        if (
          settings.timeout_seconds &&
          (settings.timeout_seconds < 1 || settings.timeout_seconds > 60)
        ) {
          return this.createErrorResponse('Webhook timeout must be between 1 and 60 seconds', 400);
        }
        break;
      case ACTION_TYPES.DATABASE:
        if (settings.batch_size && (settings.batch_size < 1 || settings.batch_size > 1000)) {
          return this.createErrorResponse('Database batch size must be between 1 and 1000', 400);
        }
        break;
    }
    return null;
  }

  /**
   * Update a single configuration setting
   */
  private async updateConfigSetting(key: string, value: string): Promise<void> {
    const [setting] = await AppSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        value,
        active: true,
        category: 'mobile_hooks',
        type: 'string',
        defaultValue: value,
        description: `Mobile hook action configuration: ${key}`,
        deleted: false,
      } as any,
    });

    if (setting.value !== value) {
      await setting.update({ value });
    }
  }

  /**
   * Ensure user is authenticated
   */
  private ensureAuthenticated(request: UniversalRequest): ApiResponse | null {
    if (!request.user?.id) {
      return this.createErrorResponseI18n('errors:auth_required', 401);
    }
    return null;
  }
}

export const adminMobileHooksActionsConfigController = new AdminMobileHooksActionsConfigController();
