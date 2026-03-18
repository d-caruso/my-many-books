import {
  type ActionSettingsUpdateRequest,
  type ActionType,
  type HookActionConfigUpdateRequest,
  type HookListenerUpdateRequest,
  type TestActionTypeRequestBody,
  type TestConfigRequestBody,
} from './MobileHooksConfig.types';
import {
  getActionMappings,
  getActionTypes,
  testActionType,
  testConfig,
  updateActionMappings,
  updateActionTypeSettings,
} from './mobileHooksActionOperations';
import {
  getEmergencyStatus,
  getHealth,
  getHookListeners,
  getListenerSettings,
  resetMobileSettings,
  updateEmergencyStatus,
  updateHookActionListeners,
  updateListenerSettings,
} from './mobileHooksSettingsOperations';
import type { UniversalRequest } from '../../types';

class MobileHooksConfigService {
  async getActionMappings() {
    return getActionMappings();
  }

  async updateActionMappings(
    changes: HookActionConfigUpdateRequest,
    request: UniversalRequest
  ) {
    return updateActionMappings(changes, request);
  }

  async getHookListeners() {
    return getHookListeners();
  }

  async updateHookActionListeners(
    changes: HookListenerUpdateRequest,
    request: UniversalRequest
  ) {
    return updateHookActionListeners(changes, request);
  }

  async testConfig(body: TestConfigRequestBody | null, request: UniversalRequest) {
    return testConfig(body, request);
  }

  async getActionTypes() {
    return getActionTypes();
  }

  async updateActionTypeSettings(
    actionType: ActionType,
    changes: ActionSettingsUpdateRequest,
    request: UniversalRequest
  ) {
    return updateActionTypeSettings(actionType, changes, request);
  }

  async testActionType(body: TestActionTypeRequestBody, request: UniversalRequest) {
    return testActionType(body, request);
  }

  async getListenerSettings() {
    return getListenerSettings();
  }

  async updateListenerSettings(
    changes: Partial<{
      analyticsEnabled: boolean;
      errorReportingEnabled: boolean;
      performanceMonitoringEnabled: boolean;
    }>,
    request: UniversalRequest
  ) {
    return updateListenerSettings(changes, request);
  }

  async resetMobileSettings(request: UniversalRequest) {
    return resetMobileSettings(request);
  }

  async getEmergencyStatus() {
    return getEmergencyStatus();
  }

  async updateEmergencyStatus(
    changes: { enabled: boolean; reason?: string },
    request: UniversalRequest
  ) {
    return updateEmergencyStatus(changes, request);
  }

  async getHealth() {
    return getHealth();
  }
}

export const mobileHooksConfigService = new MobileHooksConfigService();
