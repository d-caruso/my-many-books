import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { ApiProvider } from '../../contexts/ApiContext';
import type { SettingsApi } from '@my-many-books/shared-api';
import type { ApiService } from '../../services/api';

// SettingsProvider now calls useAuth() — provide a logged-in user so it doesn't throw
vi.mock('@my-many-books/shared-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@my-many-books/shared-auth')>();
  return { ...actual, useAuth: vi.fn().mockReturnValue({ user: { id: 1 } }) };
});

const mockSettingsApi = {
  getSettings: vi.fn(),
  getAllSettingsAdmin: vi.fn(),
  updateSetting: vi.fn(),
};

const mockApiService = {
  baseURL: 'http://localhost:3000',
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider apiService={mockApiService as unknown as ApiService}>
    <SettingsProvider settingsApi={mockSettingsApi as unknown as SettingsApi}>
      {children}
    </SettingsProvider>
  </ApiProvider>
);

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should load settings on mount', async () => {
      const mockSettings = [
        {
          key: 'test.setting',
          value: '"testValue"',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test setting',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
      expect(result.current.settings.size).toBe(1);
    });

    it('should handle loading errors', async () => {
      const error = new Error('Failed to load settings');
      mockSettingsApi.getSettings.mockRejectedValue(error);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(error);
      expect(result.current.settings.size).toBe(0);
    });

    it('should build SettingsApi from ApiService http client and config when not injected', async () => {
      const apiSettingsResponse = [
        {
          key: 'books.list.status.onchange',
          value: '"remove"',
          category: 'ui',
          type: 'enum',
          defaultValue: '"remove"',
          description: 'Behavior when book status changes',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      const mockHttpClient = {
        get: vi.fn().mockResolvedValue(apiSettingsResponse),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      };

      const mockApiServiceForSettingsClient = {
        getHttpClient: vi.fn(() => mockHttpClient),
        getApiConfig: vi.fn(() => ({ baseURL: 'http://localhost:3000', timeout: 10000 })),
      };

      const wrapperWithoutInjectedSettingsApi = ({ children }: { children: React.ReactNode }) => (
        <ApiProvider apiService={mockApiServiceForSettingsClient as unknown as ApiService}>
          <SettingsProvider>{children}</SettingsProvider>
        </ApiProvider>
      );

      const { result } = renderHook(() => useSettings(), { wrapper: wrapperWithoutInjectedSettingsApi });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.settings.size).toBe(1);
      expect(mockApiServiceForSettingsClient.getHttpClient).toHaveBeenCalledTimes(1);
      expect(mockApiServiceForSettingsClient.getApiConfig).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'http://localhost:3000/settings',
        expect.objectContaining({
          timeout: 10000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('getSetting', () => {
    it('should return setting by key', async () => {
      const mockSettings = [
        {
          key: 'test.setting',
          value: '"testValue"',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test setting',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const setting = result.current.getSetting('test.setting');
      expect(setting).toBeDefined();
      expect(setting?.key).toBe('test.setting');
    });

    it('should return undefined for non-existent setting', async () => {
      mockSettingsApi.getSettings.mockResolvedValue([]);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const setting = result.current.getSetting('nonexistent');
      expect(setting).toBeUndefined();
    });
  });

  describe('getSettingValue', () => {
    it('should return parsed value for string setting', async () => {
      const mockSettings = [
        {
          key: 'test.setting',
          value: '"testValue"',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test setting',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const value = result.current.getSettingValue<string>('test.setting');
      expect(value).toBe('testValue');
    });

    it('should return parsed value for number setting', async () => {
      const mockSettings = [
        {
          key: 'test.number',
          value: '42',
          type: 'number',
          category: 'test',
          defaultValue: '0',
          description: 'Test number',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const value = result.current.getSettingValue<number>('test.number');
      expect(value).toBe(42);
    });

    it('should return undefined for non-existent setting', async () => {
      mockSettingsApi.getSettings.mockResolvedValue([]);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const value = result.current.getSettingValue('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should handle invalid JSON gracefully', async () => {
      const mockSettings = [
        {
          key: 'test.invalid',
          value: 'invalid json',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test invalid',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const value = result.current.getSettingValue('test.invalid');
      expect(value).toBe('invalid json');
    });
  });

  describe('refreshSettings', () => {
    it('should reload settings when called', async () => {
      const initialSettings = [
        {
          key: 'test.setting',
          value: '"initial"',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test setting',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      const updatedSettings = [
        {
          key: 'test.setting',
          value: '"updated"',
          type: 'string',
          category: 'test',
          defaultValue: '"default"',
          description: 'Test setting',
          active: true,
          deleted: false,
          creationDate: new Date().toISOString(),
        },
      ];

      mockSettingsApi.getSettings
        .mockResolvedValueOnce(initialSettings)
        .mockResolvedValueOnce(updatedSettings);

      const { result } = renderHook(() => useSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.getSettingValue('test.setting')).toBe('initial');

      await result.current.refreshSettings();

      await waitFor(() => {
        expect(result.current.getSettingValue('test.setting')).toBe('updated');
      });

      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(2);
    });
  });
});
