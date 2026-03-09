/**
 * Settings Context Provider
 * Provides centralized settings management throughout the application
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { AppSetting } from '@my-many-books/shared-types';
import { SettingsApi } from '@my-many-books/shared-api';
import { useApi } from './ApiContext';

interface SettingsContextValue {
  settings: Map<string, AppSetting>;
  isLoading: boolean;
  error: Error | null;
  getSetting: (key: string) => AppSetting | undefined;
  getSettingValue: <T>(key: string) => T | undefined;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
  settingsApi?: SettingsApi;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({
  children,
  settingsApi: injectedSettingsApi
}) => {
  const { apiService } = useApi();
  const settingsApi = useMemo(
    () =>
      injectedSettingsApi ||
      new SettingsApi(apiService.getHttpClient(), apiService.getApiConfig()),
    [injectedSettingsApi, apiService]
  );

  const [settings, setSettings] = useState<Map<string, AppSetting>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedSettings = await settingsApi.getSettings();
      const settingsMap = new Map<string, AppSetting>();
      fetchedSettings.forEach(setting => {
        settingsMap.set(setting.key, setting);
      });
      setSettings(settingsMap);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load settings');
      setError(error);
      logger.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [settingsApi]);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedSettings = await settingsApi.getSettings();
        if (ignore) return;
        const settingsMap = new Map<string, AppSetting>();
        fetchedSettings.forEach(setting => {
          settingsMap.set(setting.key, setting);
        });
        setSettings(settingsMap);
      } catch (err) {
        if (ignore) return;
        const error = err instanceof Error ? err : new Error('Failed to load settings');
        setError(error);
        logger.error('Failed to load settings:', error);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, [settingsApi]);

  const getSetting = useCallback((key: string): AppSetting | undefined => {
    return settings.get(key);
  }, [settings]);

  const getSettingValue = useCallback(<T,>(key: string): T | undefined => {
    const setting = settings.get(key);
    if (!setting) return undefined;

    try {
      return JSON.parse(setting.value) as T;
    } catch {
      return setting.value as T;
    }
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    isLoading,
    error,
    getSetting,
    getSettingValue,
    refreshSettings,
  }), [settings, isLoading, error, getSetting, getSettingValue, refreshSettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

/**
 * Hook to access settings from any component
 * @throws Error if used outside SettingsProvider
 */
export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Export for testing
export { SettingsContext };
