/**
 * ApiService unit tests for admin mobile-hooks endpoints (Task 5.2).
 * Validates URL/method/body/headers and success/error handling via mocked fetch/auth.
 */
import { beforeEach, describe, it, vi } from 'vitest';
import { API_BASE_PATH } from '../utils/apiBasePath';

const { mockAxiosInstance, mockFetch } = vi.hoisted(() => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    mockAxiosInstance,
    mockFetch: vi.fn(),
  };
});

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

vi.mock('@my-many-books/shared-api', () => ({
  createApiClient: vi.fn(() => ({})),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    getIdToken: vi.fn(async () => 'test-token'),
    logout: vi.fn(),
    silentRefresh: vi.fn(async () => false),
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;
});

describe('ApiService (admin mobile-hooks)', () => {
  describe('getAdminMobileHooksListenerSettings', () => {
    it('success: returns listener settings', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        settings: {
          analyticsEnabled: true,
          errorReportingEnabled: false,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: false,
        },
        lastUpdated: null,
        version: '1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksListenerSettings();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn(async () => ({ error: 'Bad request' })),
      });

      await expect(apiService.getAdminMobileHooksListenerSettings()).rejects.toThrow('Bad request');
    });
  });

  describe('updateAdminMobileHooksListenerSettings', () => {
    it('success: updates listener settings', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const updateRequest = {
        analyticsEnabled: true,
        performanceMonitoringEnabled: false,
      };

      const expected = {
        settings: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: false,
          performanceMonitoringEnabled: false,
        },
        updated: ['analyticsEnabled', 'performanceMonitoringEnabled'],
        lastUpdated: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.updateAdminMobileHooksListenerSettings(updateRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/settings/listeners`);
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(async () => ({ error: 'Internal error' })),
      });

      await expect(
        apiService.updateAdminMobileHooksListenerSettings({ analyticsEnabled: false })
      ).rejects.toThrow('Internal error');
    });
  });

  describe('getAdminMobileHooksConfigListeners', () => {
    it('success: returns config listeners', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        listeners: {
          analytics: { enabled: true },
          errorReporting: { enabled: false },
        },
        categories: {
          core: { enabled: true },
          advanced: { enabled: false },
        },
        availableEvents: ['book.created', 'book.updated'],
        lastUpdated: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksConfigListeners();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/config/listeners`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: vi.fn(async () => ({ error: 'Forbidden' })),
      });

      await expect(apiService.getAdminMobileHooksConfigListeners()).rejects.toThrow('Forbidden');
    });
  });

  describe('getAdminMobileHooksActionsConfigMappings', () => {
    it('success: returns action mappings config', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        actions: {
          'error.unhandled': ['email', 'slack'],
        },
        actionSettings: {
          email: { enabled: true },
        },
        availableEvents: ['error.unhandled'],
        lastUpdated: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksActionsConfigMappings();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/actions-config/mappings`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(async () => ({ error: 'Failed to load mappings' })),
      });

      await expect(apiService.getAdminMobileHooksActionsConfigMappings()).rejects.toThrow(
        'Failed to load mappings'
      );
    });
  });

  describe('updateAdminMobileHooksConfigListeners', () => {
    it('success: updates config listeners', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const updateRequest = {
        analytics: true,
        offlineStorage: false,
      };

      const expected = {
        updated: ['analytics', 'offlineStorage'],
        lastUpdated: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.updateAdminMobileHooksConfigListeners(updateRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/config/listeners`);
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: vi.fn(async () => ({ error: 'Invalid listener config' })),
      });

      await expect(
        apiService.updateAdminMobileHooksConfigListeners({ analytics: true })
      ).rejects.toThrow('Invalid listener config');
    });
  });

  describe('updateAdminMobileHooksActionsConfigMappings', () => {
    it('success: updates action mappings config', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const updateRequest = {
        actions: {
          'error.unhandled': ['email'],
          'sync.failed': ['database'],
        },
      };

      const expected = {
        config: {
          actions: updateRequest.actions,
          actionSettings: {},
          availableEvents: ['error.unhandled', 'sync.failed'],
          lastUpdated: null,
        },
        updated: ['actions'],
        lastUpdated: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.updateAdminMobileHooksActionsConfigMappings(updateRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/actions-config/mappings`);
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn(async () => ({ error: 'Invalid mappings' })),
      });

      await expect(
        apiService.updateAdminMobileHooksActionsConfigMappings({ actions: {} })
      ).rejects.toThrow('Invalid mappings');
    });
  });

  describe('testAdminMobileHooksActionsConfig', () => {
    it('success: tests actions-config mapping', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const testRequest = {
        eventType: 'book.created',
        payload: { bookId: 1 },
      };

      const expected = {
        success: true,
        eventType: testRequest.eventType,
        payload: testRequest.payload,
        mappedActions: ['email'],
        actionResults: [
          {
            actionType: 'email',
            enabled: true,
            wouldExecute: true,
            settings: { recipients: ['admin@example.com'] },
          },
        ],
        summary: {
          totalActions: 1,
          enabledActions: 1,
          wouldExecute: 1,
        },
        testedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.testAdminMobileHooksActionsConfig(testRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/actions-config/test`);
      expect(options).toEqual(
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(async () => ({ error: 'Actions-config test failed' })),
      });

      await expect(apiService.testAdminMobileHooksActionsConfig()).rejects.toThrow(
        'Actions-config test failed'
      );
    });
  });

  describe('getAdminMobileHooksActionTypes', () => {
    it('success: returns action types', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        actions: {
          email: {
            description: 'Send email notifications',
            enabled: true,
            configured: true,
            warnings: [],
            settings: { recipients: ['admin@example.com'] },
          },
          slack: {
            description: 'Post to Slack',
            enabled: false,
            configured: false,
            warnings: ['Missing webhook URL'],
            settings: {},
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksActionTypes();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/actions-config/types`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn(async () => ({ error: 'Unauthorized' })),
      });

      await expect(apiService.getAdminMobileHooksActionTypes()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateAdminMobileHooksActionTypeSettings', () => {
    it('success: updates action type settings', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const actionType = 'email';
      const updateRequest = {
        enabled: true,
        recipients: ['ops@example.com'],
      };

      const expected = {
        actionType,
        settings: { enabled: true, recipients: ['ops@example.com'] },
        updated: ['enabled', 'recipients'],
        lastUpdated: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.updateAdminMobileHooksActionTypeSettings(actionType, updateRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(
        `${API_BASE_PATH}/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}`
      );
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn(async () => ({ error: 'Unknown action type' })),
      });

      await expect(
        apiService.updateAdminMobileHooksActionTypeSettings('unknown', { enabled: false })
      ).rejects.toThrow('Unknown action type');
    });
  });

  describe('testAdminMobileHooksActionType', () => {
    it('success: tests action type execution', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const actionType = 'email';
      const request = {
        dryRun: true,
        testData: { bookId: 1 },
      };

      const expected = {
        actionType,
        enabled: true,
        dryRun: true,
        testPayload: { ...request.testData },
        execution: { success: true, message: 'OK' },
        settings: { recipients: ['admin@example.com'] },
        testedAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.testAdminMobileHooksActionType(actionType, request);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(
        `${API_BASE_PATH}/admin/mobile-hooks/actions-config/types/${encodeURIComponent(actionType)}/test`
      );
      expect(options).toEqual(
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ actionType, ...request }),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn(async () => ({ error: 'Invalid test payload' })),
      });

      await expect(apiService.testAdminMobileHooksActionType('email', {})).rejects.toThrow(
        'Invalid test payload'
      );
    });
  });

  describe('getAdminMobileHooksEmergencyStatus', () => {
    it('success: returns emergency status', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        enabled: false,
        disabledAt: new Date().toISOString(),
        disabledReason: 'Maintenance',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksEmergencyStatus();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/emergency`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn(async () => ({ error: 'Emergency status unavailable' })),
      });

      await expect(apiService.getAdminMobileHooksEmergencyStatus()).rejects.toThrow(
        'Emergency status unavailable'
      );
    });
  });

  describe('updateAdminMobileHooksEmergencyStatus', () => {
    it('success: updates emergency status', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const updateRequest = { enabled: true, reason: 'Recovery complete' };

      const expected = {
        enabled: true,
        updatedAt: new Date().toISOString(),
        message: 'Updated',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.updateAdminMobileHooksEmergencyStatus(updateRequest);

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/emergency`);
      expect(options).toEqual(
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateRequest),
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn(async () => ({ error: 'Invalid emergency update' })),
      });

      await expect(
        apiService.updateAdminMobileHooksEmergencyStatus({ enabled: false })
      ).rejects.toThrow('Invalid emergency update');
    });
  });

  describe('getAdminMobileHooksHealth', () => {
    it('success: returns health status', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      const expected = {
        status: 'healthy',
        healthScore: 95,
        checks: {
          settingsLoaded: true,
          emergencyEnabled: true,
          analyticsActive: true,
          errorReportingActive: false,
          offlineStorageActive: true,
          performanceMonitoringActive: false,
        },
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ success: true, data: expected })),
      });

      const result = await apiService.getAdminMobileHooksHealth();

      expect(result).toEqual(expected);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain(`${API_BASE_PATH}/admin/mobile-hooks/health`);
      expect(options).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('error: throws on non-OK response', async () => {
      const { createApiService } = await import('../../services/api');
      const apiService = createApiService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn(async () => ({ error: 'Health check unavailable' })),
      });

      await expect(apiService.getAdminMobileHooksHealth()).rejects.toThrow('Health check unavailable');
    });
  });
});
