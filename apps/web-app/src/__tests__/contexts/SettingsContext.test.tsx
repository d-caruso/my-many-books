import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../../contexts/SettingsContext';
import { ApiProvider } from '../../contexts/ApiContext';

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
} as any;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ApiProvider apiService={mockApiService}>
    <SettingsProvider settingsApi={mockSettingsApi as any}>
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
