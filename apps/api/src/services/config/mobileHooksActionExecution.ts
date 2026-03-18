import type { JsonObject } from '../../types/json';
import { databaseActionTestService } from '../DatabaseActionTestService';
import { emailService } from '../action-tests/EmailService';
import { pushNotificationService } from '../action-tests/PushNotificationService';
import { slackService } from '../action-tests/SlackService';
import { smsService } from '../action-tests/SmsService';
import { webhookService } from '../action-tests/WebhookService';
import {
  ACTION_TYPES,
  type ActionExecutionResult,
  type ActionSettings,
  type ActionType,
} from './MobileHooksConfig.types';

export const sanitizeActionSettings = (
  actionType: ActionType,
  actionSettings: ActionSettings
): JsonObject => {
  switch (actionType) {
    case ACTION_TYPES.WEBHOOK: {
      const { webhook_url: _webhookUrl, ...sanitized } = actionSettings[ACTION_TYPES.WEBHOOK];
      return sanitized;
    }
    case ACTION_TYPES.SLACK: {
      const { webhook_url: webhookUrl, ...sanitized } = actionSettings[ACTION_TYPES.SLACK];
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
};

export const getActionWarnings = (settings: ActionSettings[ActionType]): string[] => {
  const warnings: string[] = [];
  const settingsEntries = Object.entries(settings);

  for (const field of settings.expected_fields || []) {
    const value = settingsEntries.find(([key]) => key === field)?.[1];

    if (Array.isArray(value) && value.length === 0) {
      warnings.push(`No ${field} configured`);
    } else if (typeof value === 'string' && value.trim() === '') {
      warnings.push(`No ${field} configured`);
    } else if (value === null || value === undefined) {
      warnings.push(`Missing ${field}`);
    }
  }

  return warnings;
};

export const validateActionSettings = (
  actionType: ActionType,
  settings: ActionSettings
): string | null => {
  switch (actionType) {
    case ACTION_TYPES.EMAIL: {
      const emailSettings = settings[ACTION_TYPES.EMAIL];
      if (!Array.isArray(emailSettings.recipients)) {
        return 'VALIDATION_FAILED';
      }
      if (
        emailSettings.rate_limit_minutes < 1 ||
        emailSettings.rate_limit_minutes > 1440
      ) {
        return 'EMAIL_RATE_LIMIT_INVALID';
      }
      return null;
    }
    case ACTION_TYPES.WEBHOOK: {
      const webhookSettings = settings[ACTION_TYPES.WEBHOOK];
      if (!Array.isArray(webhookSettings.endpoints)) {
        return 'VALIDATION_FAILED';
      }
      if (
        webhookSettings.timeout_seconds < 1 ||
        webhookSettings.timeout_seconds > 60
      ) {
        return 'VALIDATION_FAILED';
      }
      return null;
    }
    case ACTION_TYPES.DATABASE: {
      const databaseSettings = settings[ACTION_TYPES.DATABASE];
      if (databaseSettings.batch_size < 1 || databaseSettings.batch_size > 1000) {
        return 'VALIDATION_FAILED';
      }
      return null;
    }
    default:
      return null;
  }
};

export const validateActionExecution = (
  actionType: ActionType,
  settings: ActionSettings
): ActionExecutionResult => {
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
      return settings.email.recipients.length === 0
        ? {
            success: false,
            message: 'No email recipients configured',
            details: { recipientCount: 0 },
          }
        : {
            success: true,
            message: 'Email configuration is valid',
            details: { recipientCount: settings.email.recipients.length },
          };
    case ACTION_TYPES.SLACK:
      return settings.slack.channel
        ? {
            success: true,
            message: 'Slack configuration is valid',
            details: { channel: settings.slack.channel },
          }
        : {
            success: false,
            message: 'No Slack channel configured',
          };
    case ACTION_TYPES.WEBHOOK:
      return settings.webhook.endpoints.length === 0
        ? {
            success: false,
            message: 'No webhook endpoints configured',
            details: { endpointCount: 0 },
          }
        : {
            success: true,
            message: 'Webhook configuration is valid',
            details: { endpointCount: settings.webhook.endpoints.length },
          };
    case ACTION_TYPES.DATABASE:
      return settings.database.table
        ? {
            success: true,
            message: 'Database configuration is valid',
            details: { table: settings.database.table },
          }
        : {
            success: false,
            message: 'No database table configured',
          };
    case ACTION_TYPES.PUSH_NOTIFICATION:
      return {
        success: true,
        message: 'Push notification configuration is valid',
      };
    case ACTION_TYPES.SMS:
      return settings.sms.recipients.length === 0
        ? {
            success: false,
            message: 'No SMS recipients configured',
            details: { recipientCount: 0 },
          }
        : {
            success: true,
            message: 'SMS configuration is valid',
            details: { recipientCount: settings.sms.recipients.length },
          };
  }
};

export const executeTestAction = async (
  actionType: ActionType,
  settings: ActionSettings,
  testPayload: JsonObject
): Promise<ActionExecutionResult> => {
  const validation = validateActionExecution(actionType, settings);
  if (!validation.success) {
    return validation;
  }

  switch (actionType) {
    case ACTION_TYPES.EMAIL: {
      const endpoint = process.env['EMAIL_TEST_ENDPOINT'];
      if (!endpoint) {
        return { success: false, message: 'Email test endpoint is not configured' };
      }

      const result = await emailService.sendTestEmail(
        endpoint,
        settings.email.recipients,
        `[TEST] ${settings.email.template || 'Mobile Hook Alert'}`,
        testPayload
      );

      return {
        success: result.success,
        message: result.success ? 'Email test executed successfully' : 'Email test failed',
        details: { recipients: settings.email.recipients.length, result },
      };
    }
    case ACTION_TYPES.SLACK: {
      if (!settings.slack.webhook_url) {
        return { success: false, message: 'Slack webhook URL is missing' };
      }

      const result = await slackService.postTestMessage(settings.slack.webhook_url, testPayload);
      return {
        success: result.success,
        message: result.success
          ? 'Slack webhook test executed successfully'
          : 'Slack webhook test failed',
        details: { channel: settings.slack.channel, result },
      };
    }
    case ACTION_TYPES.WEBHOOK: {
      const results = await webhookService.executeTestEndpoints(
        settings.webhook.endpoints,
        testPayload
      );
      return {
        success: results.every(result => result.success),
        message: results.every(result => result.success)
          ? 'Webhook test executed successfully'
          : 'One or more webhook endpoints failed',
        details: { endpoints: settings.webhook.endpoints.length, results },
      };
    }
    case ACTION_TYPES.DATABASE: {
      const result = await databaseActionTestService.insertTestRecord(
        settings.database.table,
        testPayload
      );

      return {
        success: result.success,
        message: result.success
          ? 'Database test record inserted successfully'
          : 'Database test record insertion failed',
        details: { table: settings.database.table, result },
      };
    }
    case ACTION_TYPES.PUSH_NOTIFICATION: {
      const endpoint = process.env['PUSH_NOTIFICATION_TEST_ENDPOINT'];
      if (!endpoint) {
        return { success: false, message: 'Push notification test endpoint is not configured' };
      }

      const result = await pushNotificationService.sendTestNotification(endpoint, testPayload);
      return {
        success: result.success,
        message: result.success
          ? 'Push notification test executed successfully'
          : 'Push notification test failed',
        details: { result },
      };
    }
    case ACTION_TYPES.SMS: {
      const endpoint = process.env['SMS_TEST_ENDPOINT'];
      if (!endpoint) {
        return { success: false, message: 'SMS test endpoint is not configured' };
      }

      const result = await smsService.sendTestSms(
        endpoint,
        settings.sms.recipients,
        JSON.stringify(testPayload)
      );

      return {
        success: result.success,
        message: result.success ? 'SMS test executed successfully' : 'SMS test failed',
        details: { recipients: settings.sms.recipients.length, result },
      };
    }
  }
};
