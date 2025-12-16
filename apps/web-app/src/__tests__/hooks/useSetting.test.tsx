import { renderHook, waitFor } from '@testing-library/react';
import { useSetting } from '../../hooks/useSetting';
import { SettingsProvider } from '../../contexts/SettingsContext';
import { ApiProvider } from '../../contexts/ApiContext';
import React from 'react';

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

describe('useSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return setting and value for existing setting', async () => {
    const mockSettings = [
      {
        key: 'books.list.status.onchange',
        value: '"remove"',
        type: 'enum',
        category: 'ui',
        defaultValue: '"remove"',
        description: 'Behavior when book status changes',
        active: true,
        deleted: false,
        creationDate: new Date().toISOString(),
      },
    ];

    mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useSetting('books.list.status.onchange'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.setting).toBeDefined();
    expect(result.current.setting?.key).toBe('books.list.status.onchange');
    expect(result.current.value).toBe('remove');
    expect(result.current.error).toBeNull();
  });

  it('should return undefined for non-existent setting', async () => {
    mockSettingsApi.getSettings.mockResolvedValue([]);

    const { result } = renderHook(() => useSetting('nonexistent.key'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.setting).toBeUndefined();
    expect(result.current.value).toBeUndefined();
  });

  it('should parse string values correctly', async () => {
    const mockSettings = [
      {
        key: 'test.string',
        value: '"hello world"',
        type: 'string',
        category: 'test',
        defaultValue: '"default"',
        description: 'Test string',
        active: true,
        deleted: false,
        creationDate: new Date().toISOString(),
      },
    ];

    mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useSetting<string>('test.string'), { wrapper });

    await waitFor(() => {
      expect(result.current.value).toBe('hello world');
    });
  });

  it('should parse number values correctly', async () => {
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

    const { result } = renderHook(() => useSetting<number>('test.number'), { wrapper });

    await waitFor(() => {
      expect(result.current.value).toBe(42);
    });
  });

  it('should parse boolean values correctly', async () => {
    const mockSettings = [
      {
        key: 'test.boolean',
        value: 'true',
        type: 'boolean',
        category: 'test',
        defaultValue: 'false',
        description: 'Test boolean',
        active: true,
        deleted: false,
        creationDate: new Date().toISOString(),
      },
    ];

    mockSettingsApi.getSettings.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => useSetting<boolean>('test.boolean'), { wrapper });

    await waitFor(() => {
      expect(result.current.value).toBe(true);
    });
  });

  it('should reflect loading state', async () => {
    mockSettingsApi.getSettings.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));

    const { result } = renderHook(() => useSetting('test.key'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should reflect error state', async () => {
    const error = new Error('Failed to load');
    mockSettingsApi.getSettings.mockRejectedValue(error);

    const { result } = renderHook(() => useSetting('test.key'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should return default value when provided and setting not found', async () => {
    mockSettingsApi.getSettings.mockResolvedValue([]);

    const { result } = renderHook(() => useSetting('test.key'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.defaultValue).toBeUndefined();
  });
});
