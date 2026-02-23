import { describe, test, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server, resetMobileHooksState } from '../mocks/server';
import { createApiService } from '../../services/api';
import { API_BASE_PATH } from '../utils/apiBasePath';

vi.mock('../../config/env', () => {
  const mockedEnv = {
    NODE_ENV: 'test',
    API_URL: 'http://localhost:3001/api/v1',
    API_ORIGIN: 'http://localhost:3001',
    API_PREFIX: '/api',
    API_VERSION: 'v1',
    API_BASE_URL: 'http://localhost:3001/api/v1',
    COGNITO_USER_POOL_ID: '',
    COGNITO_USER_POOL_CLIENT_ID: '',
    COGNITO_IDENTITY_POOL_ID: '',
    AWS_REGION: 'us-east-1',
    BOOKS_PAGINATION_DEFAULT: 5,
  };

  return {
    env: mockedEnv,
    default: mockedEnv,
    ...mockedEnv,
  };
});

vi.mock('../../services/authService', () => ({
  authService: {
    getIdToken: vi.fn(async () => 'msw-token'),
    logout: vi.fn(),
    silentRefresh: vi.fn(async () => false),
  },
}));

const apiService = createApiService();

describe('Admin mobile-hooks API (MSW)', () => {
  beforeEach(() => {
    resetMobileHooksState();
    server.resetHandlers();
  });

  describe('listener settings', () => {
    test('getAdminMobileHooksListenerSettings returns current settings', async () => {
      const result = await apiService.getAdminMobileHooksListenerSettings();
      expect(result.settings).toHaveProperty('analyticsEnabled');
      expect(result.lastUpdated).toBeTruthy();
      expect(result.version).toBeDefined();
    });

    test('updateAdminMobileHooksListenerSettings sends the patch payload', async () => {
      const updates = { analyticsEnabled: false, performanceMonitoringEnabled: false };
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put(`*${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({
            data: {
              settings: {
                analyticsEnabled: capturedBody?.analyticsEnabled ?? true,
                errorReportingEnabled: true,
                offlineStorageEnabled: true,
                performanceMonitoringEnabled: capturedBody?.performanceMonitoringEnabled ?? true,
              },
              lastUpdated: new Date().toISOString(),
              version: '1.0.0',
            },
          });
        })
      );

      const result = await apiService.updateAdminMobileHooksListenerSettings(updates);
      expect(capturedBody).toEqual(updates);
      expect(result.settings.analyticsEnabled).toBe(false);
      expect(result.version).toBe('1.0.0');
    });
  });

  describe('config listeners', () => {
    test('getAdminMobileHooksConfigListeners returns listeners and categories', async () => {
      const result = await apiService.getAdminMobileHooksConfigListeners();
      expect(result.listeners).toHaveProperty('error.unhandled');
      expect(result.categories).toHaveProperty('errors');
      expect(result.availableEvents.length).toBeGreaterThanOrEqual(1);
      expect(result.lastUpdated).toBeTruthy();
    });

    test('updateAdminMobileHooksConfigListeners merges updates', async () => {
      const listenersUpdate = {
        listeners: {
          'user.created': { enabled: true },
        },
        categories: {
          errors: { enabled: false },
        },
      };
      let payloadBody: Record<string, unknown> | null = null;

      server.use(
        http.put(`*${API_BASE_PATH}/admin/mobile-hooks/config/listeners`, async ({ request }) => {
          payloadBody = await request.json();
          return HttpResponse.json({
            data: {
              config: {
                listeners: payloadBody?.listeners ?? {},
                categories: payloadBody?.categories ?? {},
                availableEvents: ['user.created'],
                lastUpdated: new Date().toISOString(),
              },
              updated: ['listeners.user.created.enabled', 'categories.errors.enabled'],
              lastUpdated: new Date().toISOString(),
            },
          });
        })
      );

      const result = await apiService.updateAdminMobileHooksConfigListeners(listenersUpdate);
      expect(payloadBody).toEqual(listenersUpdate);
      expect(result.updated).toEqual([
        'listeners.user.created.enabled',
        'categories.errors.enabled',
      ]);
      expect(result.config.listeners).toHaveProperty('user.created');
    });

    test('getAdminMobileHooksConfigListeners throws on failure', async () => {
      server.use(
        http.get(`*${API_BASE_PATH}/admin/mobile-hooks/config/listeners`, () =>
          HttpResponse.json({ error: 'boom' }, { status: 500 })
        )
      );
      await expect(apiService.getAdminMobileHooksConfigListeners()).rejects.toThrow('boom');
    });
  });

  describe('action mappings', () => {
    test('getAdminMobileHooksActionsConfigMappings returns mapping payload', async () => {
      const result = await apiService.getAdminMobileHooksActionsConfigMappings();
      expect(result.actions).toHaveProperty('error.unhandled');
      expect(result.availableEvents).toContain('error.unhandled');
    });

    test('updateAdminMobileHooksActionsConfigMappings posts actions payload', async () => {
      const mapping = {
        actions: {
          'error.unhandled': ['email', 'webhook'],
        },
      };
      let requestBody: Record<string, unknown> | null = null;

      server.use(
        http.put(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/mappings`, async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json({
            data: {
              config: {
                actions: requestBody?.actions ?? {},
                actionSettings: {},
                availableEvents: ['error.unhandled'],
                lastUpdated: new Date().toISOString(),
              },
              updated: ['actions'],
              lastUpdated: new Date().toISOString(),
            },
          });
        })
      );

      const result = await apiService.updateAdminMobileHooksActionsConfigMappings(mapping);
      expect(requestBody).toEqual(mapping);
      expect(result.config.actions['error.unhandled']).toEqual(['email', 'webhook']);
      expect(result.updated).toEqual(['actions']);
    });

    test('testAdminMobileHooksActionsConfig returns execution result', async () => {
      const result = await apiService.testAdminMobileHooksActionsConfig();
      expect(result.executed).toBe(true);
    });
  });

  describe('action types', () => {
    test('getAdminMobileHooksActionTypes returns available actions', async () => {
      const result = await apiService.getAdminMobileHooksActionTypes();
      expect(result.actions.email).toBeDefined();
      expect(result.actions.webhook).toBeDefined();
    });

    test('updateAdminMobileHooksActionTypeSettings hits namespaced endpoint', async () => {
      const actionType = 'email';
      const settingsUpdate = { enabled: false };
      let captured: Record<string, unknown> | null = null;

      server.use(
        http.put(`*${API_BASE_PATH}/admin/mobile-hooks/actions-config/types/email`, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({
            data: {
              actionType: 'email',
              settings: captured,
              updated: ['settings'],
              lastUpdated: new Date().toISOString(),
            },
          });
        })
      );

      const result = await apiService.updateAdminMobileHooksActionTypeSettings(actionType, settingsUpdate);
      expect(captured).toEqual(settingsUpdate);
      expect(result.actionType).toBe('email');
      expect(result.settings).toEqual(settingsUpdate);
    });

    test('testAdminMobileHooksActionType exercises action type', async () => {
      const result = await apiService.testAdminMobileHooksActionType('webhook', { endpoint: 'https://example.com' });
      expect(result.actionType).toBe('webhook');
      expect(result.status).toBe('success');
    });
  });

  describe('emergency and health', () => {
    test('getAdminMobileHooksEmergencyStatus returns current state', async () => {
      const result = await apiService.getAdminMobileHooksEmergencyStatus();
      expect(result.enabled).toBe(true);
    });

    test('updateAdminMobileHooksEmergencyStatus toggles fields', async () => {
      const payload = { enabled: false, emergencyReason: 'manual test' };
      let captured: Record<string, unknown> | null = null;

      server.use(
        http.put(`*${API_BASE_PATH}/admin/mobile-hooks/emergency`, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({
            data: {
              ...captured,
              updatedAt: new Date().toISOString(),
            },
          });
        })
      );

      const result = await apiService.updateAdminMobileHooksEmergencyStatus(payload);
      expect(captured).toEqual(payload);
      expect(result.enabled).toBe(false);
      expect(result.updatedAt).toBeTruthy();
      expect(result.emergencyReason).toBe('manual test');
    });

    test('getAdminMobileHooksHealth returns status and checks', async () => {
      const result = await apiService.getAdminMobileHooksHealth();
      expect(result.status).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
    });

    test('getAdminMobileHooksRecentEvents respects limit query', async () => {
      let capturedLimit: string | null = null;

      server.use(
        http.get(`*${API_BASE_PATH}/admin/mobile-hooks/analytics/events/recent`, ({ request }) => {
          const url = new URL(request.url);
          capturedLimit = url.searchParams.get('limit');
          return HttpResponse.json({
            data: {
              events: [],
            },
          });
        })
      );

      const result = await apiService.getAdminMobileHooksRecentEvents(1);
      expect(capturedLimit).toBe('1');
      expect(result.events).toEqual([]);
    });
  });
});
