/**
 * useSetting Hook
 * Provides easy access to individual settings with type-safe value extraction
 */

import { useCallback } from 'react';
import { AppSetting } from '@my-many-books/shared-types';
import { useSettings } from '../contexts/SettingsContext';

export interface UseSettingResult<T> {
  setting: AppSetting | undefined;
  value: T | undefined;
  defaultValue: T | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to access a single setting by key
 * @param key - The setting key (e.g., 'books.list.status.onchange')
 * @returns Setting data with typed value
 */
export function useSetting<T = unknown>(key: string): UseSettingResult<T> {
  const { getSetting, getSettingValue, isLoading, error } = useSettings();

  const setting = getSetting(key);
  const value = getSettingValue<T>(key);

  const getDefaultValue = useCallback((): T | undefined => {
    if (!setting) return undefined;
    try {
      return JSON.parse(setting.defaultValue) as T;
    } catch {
      return setting.defaultValue as T;
    }
  }, [setting]);

  return {
    setting,
    value,
    defaultValue: getDefaultValue(),
    isLoading,
    error,
  };
}
