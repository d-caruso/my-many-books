// ================================================================
// src/controllers/admin/AdminMobileHooksController.ts
// Admin hook action configuration endpoints
// ================================================================

import { BaseController } from '../base/BaseController';
import { ApiResponse } from '../../common/ApiResponse';
import { UniversalRequest } from '../../types';
import { AppSetting } from '../../models';
import { getAuditLogService } from '../../services/AuditLogService';

// Action types available for mobile hooks
export const ACTION_TYPES = {
  EMAIL: 'email',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  DATABASE: 'database',
  PUSH_NOTIFICATION: 'push_notification',
  SMS: 'sms',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

export interface HookActionMapping {
  [eventName: string]: ActionType[];
}

export interface ActionSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    template: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  slack: {
    enabled: boolean;
    channel: string;
    rate_limit_minutes: number;
    mention_users: string[];
    webhook_url?: string;
  };
  webhook: {
    enabled: boolean;
    endpoints: string[];
    rate_limit_minutes: number;
    timeout_seconds: number;
    retry_attempts: number;
  };
  database: {
    enabled: boolean;
    table: string;
    batch_size: number;
    retention_days: number;
  };
  push_notification: {
    enabled: boolean;
    rate_limit_minutes: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  sms: {
    enabled: boolean;
    recipients: string[];
    rate_limit_minutes: number;
    emergency_only: boolean;
  };
}

export interface HookActionConfigResponse {
  actions: HookActionMapping;
  action_settings: ActionSettings;
  available_events: string[];
  last_updated: string | null;
}

export interface HookActionConfigUpdateRequest {
  actions?: HookActionMapping;
  action_settings?: Partial<ActionSettings>;
}

export interface ActionSettingsUpdateRequest {
  enabled?: boolean;
  [key: string]: any;
}

export class AdminMobileHooksController extends BaseController {
  /**
   * GET /api/admin/mobile-hooks/config - Get hook action mappings
   */
  async getHookActionConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    try {
      const config = await this.loadHookActionConfig();
      return this.createSuccessResponse(config);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to fetch hook action configuration', 500);
    }
  }

  /**
   * PUT /api/admin/mobile-hooks/config - Update hook action mappings
   */
  async updateHookActionConfig(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const body = this.parseBody<HookActionConfigUpdateRequest>(request);
    if (!body) {
      return this.createErrorResponseI18n('errors:validation_failed', 400);
    }

    try {
      const oldConfig = await this.loadHookActionConfig();
      const updatedSettings: string[] = [];

      // Update action mappings
      if (body.actions) {
        await this.updateConfigSetting('mobile.hooks.actions.mappings', JSON.stringify(body.actions));
        updatedSettings.push('actions');
      }

      // Update action settings
      if (body.action_settings) {
        for (const [actionType, settings] of Object.entries(body.action_settings)) {
          const key = `mobile.hooks.actions.settings.${actionType}`;
          await this.updateConfigSetting(key, JSON.stringify(settings));
          updatedSettings.push(`action_settings.${actionType}`);
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

      const newConfig = await this.loadHookActionConfig();

      return this.createSuccessResponse({
        config: newConfig,
        updated: updatedSettings,
        lastUpdated: new Date().toISOString(),
      }, 'Hook action configuration updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse('Failed to update hook action configuration', 500);
    }
  }

  /**
   * GET /api/admin/mobile-hooks/actions - Get available action types
   */
  async getAvailableActions(request: UniversalRequest): Promise<ApiResponse> {
    await this.initializeI18n(request);
    const authError = this.ensureAuthenticated(request);
    if (authError) return authError;

    const availableActions = {
      action_types: ACTION_TYPES,
      action_descriptions: {
        [ACTION_TYPES.EMAIL]: 'Send email notifications to configured recipients',
        [ACTION_TYPES.SLACK]: 'Send messages to Slack channels with optional user mentions',
        [ACTION_TYPES.WEBHOOK]: 'Send HTTP POST requests to external webhook endpoints',
        [ACTION_TYPES.DATABASE]: 'Store events in database tables for analytics',
        [ACTION_TYPES.PUSH_NOTIFICATION]: 'Send push notifications to mobile devices',
        [ACTION_TYPES.SMS]: 'Send SMS messages for critical alerts',
      },
      default_settings: this.getDefaultActionSettings(),
    };

    return this.createSuccessResponse(availableActions);
  }

  /**
   * PUT /api/admin/mobile-hooks/actions/{action_type} - Update action settings
   */
  async updateActionSettings(request: UniversalRequest): Promise<ApiResponse> {
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
      const currentConfig = await this.loadHookActionConfig();
      const currentSettings = currentConfig.action_settings[actionType];

      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...body };

      // Validate settings based on action type
      const validationError = this.validateActionSettings(actionType, updatedSettings);
      if (validationError) {
        return validationError;
      }

      // Update the settings
      const key = `mobile.hooks.actions.settings.${actionType}`;
      await this.updateConfigSetting(key, JSON.stringify(updatedSettings));

      // Log audit event
      getAuditLogService().logActionFromRequest(
        request,
        'UPDATE_ACTION_SETTINGS',
        'mobile_hook_action_settings',
        actionType,
        {
          oldSettings: currentSettings,
          newSettings: updatedSettings,
          actionType,
        }
      );

      return this.createSuccessResponse({
        action_type: actionType,
        settings: updatedSettings,
        updated: Object.keys(body),
        lastUpdated: new Date().toISOString(),
      }, `${actionType} action settings updated successfully`);
    } catch (error) {
      if (error instanceof Error) {
        return this.createErrorResponse(error.message, 500);
      }
      return this.createErrorResponse(`Failed to update ${actionType} action settings`, 500);
    }
  }

  /**
   * Load hook action configuration from database
   */
  private async loadHookActionConfig(): Promise<HookActionConfigResponse> {
    const settings = await AppSetting.findAll({
      where: {
        key: {
          $like: 'mobile.hooks.actions.%'
        } as any,
      },
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    // Load action mappings
    const actionMappingsStr = settingsMap.get('mobile.hooks.actions.mappings');
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
      const settingsStr = settingsMap.get(`mobile.hooks.actions.settings.${actionType}`);
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
          $like: 'mobile.hooks.actions.%'
        } as any,
      },
      order: [['updateDate', 'DESC']],
    });

    return {
      actions,
      action_settings: actionSettings,
      available_events: availableEvents,
      last_updated: lastUpdatedSetting?.updateDate?.toISOString() || null,
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
        enabled: true,
        recipients: ['dev-team@company.com'],
        rate_limit_minutes: 5,
        template: 'mobile_alert',
        priority: 'medium',
      },
      slack: {
        enabled: true,
        channel: '#mobile-alerts',
        rate_limit_minutes: 2,
        mention_users: ['@dev-team'],
      },
      webhook: {
        enabled: false,
        endpoints: [],
        rate_limit_minutes: 1,
        timeout_seconds: 10,
        retry_attempts: 3,
      },
      database: {
        enabled: true,
        table: 'mobile_analytics',
        batch_size: 100,
        retention_days: 90,
      },
      push_notification: {
        enabled: false,
        rate_limit_minutes: 10,
        priority: 'medium',
      },
      sms: {
        enabled: false,
        recipients: [],
        rate_limit_minutes: 60,
        emergency_only: true,
      },
    };
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
        if (settings.rate_limit_minutes && (settings.rate_limit_minutes < 1 || settings.rate_limit_minutes > 1440)) {
          return this.createErrorResponse('Email rate limit must be between 1 and 1440 minutes', 400);
        }
        break;
      case ACTION_TYPES.WEBHOOK:
        if (settings.endpoints && !Array.isArray(settings.endpoints)) {
          return this.createErrorResponse('Webhook endpoints must be an array', 400);
        }
        if (settings.timeout_seconds && (settings.timeout_seconds < 1 || settings.timeout_seconds > 60)) {
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

export const adminMobileHooksController = new AdminMobileHooksController();