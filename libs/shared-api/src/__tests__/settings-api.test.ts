import { SettingsApi } from '../settings-api';
import { MockHttpClient } from '../__mocks__/MockHttpClient';
import { ZodError } from 'zod';
import { AppSetting } from '@my-many-books/shared-types';

function getItemOrThrow<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (!item) {
    throw new Error(`Expected ${label} at index ${index}`);
  }
  return item;
}

describe('SettingsApi', () => {
  let mockHttpClient: MockHttpClient;
  let settingsApi: SettingsApi;

  const rawSetting = {
    key: 'ui.theme',
    value: '"dark"',
    category: 'ui',
    type: 'string',
    defaultValue: '"light"',
    description: 'Theme preference',
    active: true,
    deleted: false,
    deletedAt: undefined,
    lastSyncedAt: '2024-01-02T00:00:00.000Z',
    creationDate: '2024-01-01T00:00:00.000Z',
    updateDate: '2024-01-03T00:00:00.000Z',
  };

  const expectedSetting: AppSetting = {
    key: 'ui.theme',
    value: '"dark"',
    category: 'ui',
    type: 'string',
    defaultValue: '"light"',
    description: 'Theme preference',
    active: true,
    deleted: false,
    deletedAt: undefined,
    lastSyncedAt: new Date('2024-01-02T00:00:00.000Z'),
    creationDate: new Date('2024-01-01T00:00:00.000Z'),
    updateDate: new Date('2024-01-03T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    settingsApi = new SettingsApi(mockHttpClient, {
      baseURL: 'https://api.example.com',
    });
  });

  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('getSettings', () => {
    it('should fetch all active settings', async () => {
      mockHttpClient.setResponse('/settings', {
        data: [rawSetting],
        status: 200,
      });

      const result = await settingsApi.getSettings();

      expect(result).toEqual([expectedSetting]);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/settings');
    });

    it('should validate response against AppSettingsArraySchema', async () => {
      mockHttpClient.setResponse('/settings', {
        data: { invalid: 'data' },
        status: 200,
      });

      await expect(settingsApi.getSettings()).rejects.toThrow(ZodError);
    });

    it('should propagate HTTP errors', async () => {
      mockHttpClient.setResponse('/settings', {
        data: { error: 'Server error' },
        status: 500,
      });

      await expect(settingsApi.getSettings()).rejects.toThrow('HTTP Error 500');
    });
  });

  describe('getSetting', () => {
    it('should fetch a specific setting by key', async () => {
      mockHttpClient.setResponse('/settings/ui.theme', {
        data: rawSetting,
        status: 200,
      });

      const result = await settingsApi.getSetting('ui.theme');

      expect(result).toEqual(expectedSetting);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/settings/ui.theme');
    });

    it('should validate response against AppSettingSchema', async () => {
      mockHttpClient.setResponse('/settings/ui.theme', {
        data: { key: 'ui.theme' },
        status: 200,
      });

      await expect(settingsApi.getSetting('ui.theme')).rejects.toThrow(ZodError);
    });

    it('should propagate 404 errors', async () => {
      mockHttpClient.setResponse('/settings/missing.key', {
        data: { error: 'Not found' },
        status: 404,
      });

      await expect(settingsApi.getSetting('missing.key')).rejects.toThrow(
        'HTTP Error 404'
      );
    });
  });

  describe('getAllSettingsAdmin', () => {
    it('should fetch all settings including deleted', async () => {
      const deletedRawSetting = {
        ...rawSetting,
        key: 'features.beta',
        value: 'true',
        category: 'features',
        type: 'boolean',
        defaultValue: 'false',
        deleted: true,
        deletedAt: '2024-01-04T00:00:00.000Z',
      };

      mockHttpClient.setResponse('/settings/admin', {
        data: [rawSetting, deletedRawSetting],
        status: 200,
      });

      const result = await settingsApi.getAllSettingsAdmin();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expectedSetting);
      const secondSetting = getItemOrThrow(result, 1, 'setting');
      expect(secondSetting.key).toBe('features.beta');
      expect(secondSetting.deleted).toBe(true);
      expect(secondSetting.deletedAt).toEqual(new Date('2024-01-04T00:00:00.000Z'));
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('GET');
      expect(lastRequest?.url).toContain('/settings/admin');
    });
  });

  describe('updateSetting', () => {
    it('should update a setting value via PATCH', async () => {
      mockHttpClient.setResponse('/settings/admin/ui.theme', {
        data: { ...rawSetting, value: '"light"' },
        status: 200,
      });

      const result = await settingsApi.updateSetting('ui.theme', 'light');

      expect(result.value).toBe('"light"');
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/settings/admin/ui.theme');
      expect(lastRequest?.data).toEqual({ value: 'light' });
    });

    it('should validate response against AppSettingSchema', async () => {
      mockHttpClient.setResponse('/settings/admin/ui.theme', {
        data: { key: 'ui.theme' },
        status: 200,
      });

      await expect(settingsApi.updateSetting('ui.theme', 'light')).rejects.toThrow(
        ZodError
      );
    });
  });

  describe('toggleActive', () => {
    it('should toggle active status via PATCH', async () => {
      mockHttpClient.setResponse('/settings/admin/ui.theme/toggle', {
        data: { ...rawSetting, active: false },
        status: 200,
      });

      const result = await settingsApi.toggleActive('ui.theme', false);

      expect(result.active).toBe(false);
      const lastRequest = mockHttpClient.getLastRequest();
      expect(lastRequest?.method).toBe('PATCH');
      expect(lastRequest?.url).toContain('/settings/admin/ui.theme/toggle');
      expect(lastRequest?.data).toEqual({ active: false });
    });
  });
});
