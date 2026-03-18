import { getAuditLogService } from '../AuditLogService';
import { controlPlaneHookService } from '../hooks/ControlPlaneHookService';
import { EVENTS } from '../hooks/events';
import type { UniversalRequest } from '../../types';
import type { JsonObject } from '../../types/json';
import {
  executeTestAction,
  getActionWarnings,
  sanitizeActionSettings,
  validateActionExecution,
  validateActionSettings,
} from './mobileHooksActionExecution';
import { loadActionConfig, saveMobileHookSetting } from './mobileHooksConfigStore';
import {
  ACTION_DESCRIPTIONS,
  ACTION_TYPES,
  ACTIONS_BASE,
  type ActionSettings,
  type ActionSettingsUpdateRequest,
  type ActionType,
  type HookActionConfigUpdateRequest,
  type TestActionTypeRequestBody,
  type TestConfigRequestBody,
} from './MobileHooksConfig.types';

export const getActionMappings = async () => loadActionConfig();

export const updateActionMappings = async (
  changes: HookActionConfigUpdateRequest,
  request: UniversalRequest
) => {
  const previousConfig = await loadActionConfig();
  const updatedSettings: string[] = [];
  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'BEFORE',
      {
        actor,
        changes,
        previousConfig,
      }
    );

    if (changes.actions) {
      await saveMobileHookSetting(`${ACTIONS_BASE}.mappings`, JSON.stringify(changes.actions));
      updatedSettings.push('actions');
    }

    if (changes.actionSettings) {
      for (const [actionType, settings] of Object.entries(changes.actionSettings)) {
        await saveMobileHookSetting(
          `${ACTIONS_BASE}.settings.${actionType}`,
          JSON.stringify(settings)
        );
        updatedSettings.push(`actionSettings.${actionType}`);
      }
    }

    getAuditLogService().logActionFromRequest(
      request,
      'UPDATE_HOOK_ACTIONS',
      'mobile_hook_actions',
      'hook_action_config',
      {
        oldConfig: previousConfig,
        newConfig: changes,
        changes: updatedSettings,
      }
    );

    const config = await loadActionConfig();

    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'AFTER',
      {
        actor,
        changes,
        previousConfig,
        config,
        updated: updatedSettings,
      }
    );

    return {
      config,
      updated: updatedSettings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'FAILURE',
      { actor, changes, error }
    );
    throw error;
  }
};

export const testConfig = async (body: TestConfigRequestBody | null, request: UniversalRequest) => {
  const config = await loadActionConfig();
  const eventType = body?.eventType || 'test.hook.config';
  const payload = (body?.payload || {
    test: true,
    triggeredBy: request.user?.id ?? null,
    timestamp: new Date().toISOString(),
  }) as JsonObject;

  const mappedActions = config.actions[eventType] || [];
  const actionResults = mappedActions.map(actionType => {
    const actionSettings = config.actionSettings[actionType];
    return {
      actionType,
      enabled: actionSettings?.enabled ?? false,
      wouldExecute: actionSettings?.enabled ?? false,
      settings: sanitizeActionSettings(actionType, config.actionSettings),
    };
  });

  getAuditLogService().logActionFromRequest(
    request,
    'TEST_HOOK_CONFIG',
    'mobile_hook_actions',
    'hook_action_test',
    { eventType, actionsChecked: mappedActions.length }
  );

  return {
    success: true,
    eventType,
    payload,
    mappedActions,
    actionResults,
    summary: {
      totalActions: mappedActions.length,
      enabledActions: actionResults.filter(result => result.enabled).length,
      wouldExecute: actionResults.filter(result => result.wouldExecute).length,
    },
    testedAt: new Date().toISOString(),
  };
};

export const getActionTypes = async () => {
  const config = await loadActionConfig();
  return {
    actions: {
      [ACTION_TYPES.EMAIL]: buildActionDetails(ACTION_TYPES.EMAIL, config.actionSettings),
      [ACTION_TYPES.SLACK]: buildActionDetails(ACTION_TYPES.SLACK, config.actionSettings),
      [ACTION_TYPES.WEBHOOK]: buildActionDetails(ACTION_TYPES.WEBHOOK, config.actionSettings),
      [ACTION_TYPES.DATABASE]: buildActionDetails(ACTION_TYPES.DATABASE, config.actionSettings),
      [ACTION_TYPES.PUSH_NOTIFICATION]: buildActionDetails(
        ACTION_TYPES.PUSH_NOTIFICATION,
        config.actionSettings
      ),
      [ACTION_TYPES.SMS]: buildActionDetails(ACTION_TYPES.SMS, config.actionSettings),
    },
  };
};

export const updateActionTypeSettings = async (
  actionType: ActionType,
  changes: ActionSettingsUpdateRequest,
  request: UniversalRequest
) => {
  const config = await loadActionConfig();
  const currentSettings = config.actionSettings[actionType];
  const nextActionSettings = {
    ...config.actionSettings,
    [actionType]: {
      ...config.actionSettings[actionType],
      ...changes,
    },
  } as ActionSettings;

  const validationError = validateActionSettings(actionType, nextActionSettings);
  if (validationError) {
    throw new Error(validationError);
  }

  const actor = controlPlaneHookService.getActorContext(request.user);

  try {
    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'BEFORE',
      {
        actor,
        actionType,
        currentSettings,
        changes,
      }
    );

    await saveMobileHookSetting(
      `${ACTIONS_BASE}.settings.${actionType}`,
      JSON.stringify(nextActionSettings[actionType])
    );

    getAuditLogService().logActionFromRequest(
      request,
      'UPDATE_actionSettings',
      'mobile_hook_action_settings',
      actionType,
      {
        oldSettings: currentSettings,
        newSettings: nextActionSettings[actionType],
        actionType,
      }
    );

    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'AFTER',
      {
        actor,
        actionType,
        previousSettings: currentSettings,
        settings: nextActionSettings[actionType],
        changes,
      }
    );

    return {
      action_type: actionType,
      settings: nextActionSettings[actionType],
      updated: Object.keys(changes),
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    await controlPlaneHookService.emitLifecycleEvent(
      EVENTS.CONFIG.MOBILE.HOOKS.ACTIONS.UPDATE,
      'FAILURE',
      {
        actor,
        actionType,
        changes,
        error,
      }
    );
    throw error;
  }
};

export const testActionType = async (
  body: TestActionTypeRequestBody,
  request: UniversalRequest
) => {
  const config = await loadActionConfig();
  const actionSettings = config.actionSettings[body.actionType];
  const testPayload: JsonObject = {
    eventType: 'test.action.execution',
    message: `Test ${body.actionType} action triggered by admin`,
    triggeredBy: request.user?.id ?? null,
    timestamp: new Date().toISOString(),
    ...(body.testData || {}),
  };

  const execution =
    body.dryRun === false
      ? await executeTestAction(body.actionType, config.actionSettings, testPayload)
      : validateActionExecution(body.actionType, config.actionSettings);

  getAuditLogService().logActionFromRequest(
    request,
    'TEST_ACTION_EXECUTION',
    'mobile_hook_action_settings',
    body.actionType,
    {
      actionType: body.actionType,
      dryRun: body.dryRun ?? true,
      success: execution.success,
    }
  );

  return {
    actionType: body.actionType,
    enabled: actionSettings.enabled,
    dryRun: body.dryRun ?? true,
    testPayload,
    execution,
    settings: sanitizeActionSettings(body.actionType, config.actionSettings),
    testedAt: new Date().toISOString(),
  };
};

const buildActionDetails = (actionType: ActionType, settings: ActionSettings) => {
  const currentSettings = settings[actionType];
  const warnings = getActionWarnings(currentSettings);

  return {
    description: ACTION_DESCRIPTIONS[actionType],
    enabled: currentSettings.enabled,
    configured: warnings.length === 0,
    warnings,
    settings: currentSettings,
  };
};
