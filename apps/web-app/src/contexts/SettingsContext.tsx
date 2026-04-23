/**
 * Settings Context Provider
 * Provides centralized settings management throughout the application
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { AppSetting, SETTING_DEFINITIONS, SETTING_KEYS } from '@my-many-books/shared-types';
import { SettingsApi } from '@my-many-books/shared-api';
import { useApi } from './ApiContext';
import { useAuth } from '@my-many-books/shared-auth';

interface SettingsContextValue {
  settings: Map<string, AppSetting>;
  isLoading: boolean;
  error: Error | null;
  getSetting: (key: string) => AppSetting | undefined;
  getSettingValue: <T>(key: string) => T | undefined;
  updateSetting: (key: string, value: unknown) => Promise<AppSetting>;
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
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const settingsApi = useMemo(
    () =>
      injectedSettingsApi ||
      new SettingsApi(apiService.getHttpClient(), apiService.getApiConfig()),
    [injectedSettingsApi, apiService]
  );

  const [settings, setSettings] = useState<Map<string, AppSetting>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const getOnboardingStorageKey = useCallback((currentUserId: number | string) => {
    return `web:setting:${SETTING_KEYS.ONBOARDING.COMPLETED}:user:${currentUserId}`;
  }, []);

  const applyOnboardingOverride = useCallback(
    (settingsMap: Map<string, AppSetting>): Map<string, AppSetting> => {
      if (!userId || typeof window === 'undefined') {
        return settingsMap;
      }

      const storedValue = window.localStorage.getItem(getOnboardingStorageKey(userId));

      if (storedValue === null) {
        return settingsMap;
      }

      const onboardingDefinition = SETTING_DEFINITIONS.ONBOARDING.COMPLETED;
      const existing = settingsMap.get(onboardingDefinition.key);

      settingsMap.set(onboardingDefinition.key, {
        key: onboardingDefinition.key,
        value: storedValue,
        category: onboardingDefinition.category,
        type: onboardingDefinition.type,
        defaultValue: JSON.stringify(onboardingDefinition.defaultValue),
        description: onboardingDefinition.description,
        active: existing?.active ?? true,
        deleted: existing?.deleted ?? false,
        creationDate: existing?.creationDate ?? new Date(),
        deletedAt: existing?.deletedAt,
        lastSyncedAt: existing?.lastSyncedAt,
        updateDate: new Date(),
      });

      return settingsMap;
    },
    [getOnboardingStorageKey, userId]
  );

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedSettings = await settingsApi.getSettings();
      const settingsMap = new Map<string, AppSetting>();
      fetchedSettings.forEach(setting => {
        settingsMap.set(setting.key, setting);
      });
      setSettings(applyOnboardingOverride(settingsMap));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load settings');
      setError(error);
      logger.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyOnboardingOverride, settingsApi]);

  useEffect(() => {
    // Skip for unauthenticated users — settings are not needed on the auth page.
    // Re-runs when userId changes (null → id after login), fetching on first authenticated mount.
    if (!userId) {
      setIsLoading(false);
      return;
    }

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
        setSettings(applyOnboardingOverride(settingsMap));
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
  }, [applyOnboardingOverride, settingsApi, userId]);

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

  const updateSetting = useCallback(
    async (key: string, value: unknown): Promise<AppSetting> => {
      if (key === SETTING_KEYS.ONBOARDING.COMPLETED && userId && typeof window !== 'undefined') {
        const serializedValue = JSON.stringify(Boolean(value));
        const onboardingDefinition = SETTING_DEFINITIONS.ONBOARDING.COMPLETED;

        window.localStorage.setItem(getOnboardingStorageKey(userId), serializedValue);

        const nextSetting = {
          key,
          value: serializedValue,
          category: onboardingDefinition.category,
          type: onboardingDefinition.type,
          defaultValue: JSON.stringify(onboardingDefinition.defaultValue),
          description: onboardingDefinition.description,
          active: true,
          deleted: false,
          creationDate: settings.get(key)?.creationDate ?? new Date(),
          deletedAt: settings.get(key)?.deletedAt,
          lastSyncedAt: settings.get(key)?.lastSyncedAt,
          updateDate: new Date(),
        } satisfies AppSetting;

        setSettings((prev) => {
          const next = new Map(prev);
          next.set(key, nextSetting);
          return next;
        });

        return nextSetting;
      }

      const updatedSetting = await settingsApi.updateSetting(key, value);
      setSettings((prev) => {
        const next = new Map(prev);
        next.set(key, updatedSetting);
        return next;
      });
      return updatedSetting;
    },
    [getOnboardingStorageKey, settings, settingsApi, userId]
  );

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const value = useMemo<SettingsContextValue>(() => ({
    settings,
    isLoading,
    error,
    getSetting,
    getSettingValue,
    updateSetting,
    refreshSettings,
  }), [settings, isLoading, error, getSetting, getSettingValue, updateSetting, refreshSettings]);

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
