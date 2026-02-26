// ================================================================
// src/services/hooks/mobileHookConfigService.ts
// Mobile hook configuration priority system service
// ================================================================

import { MobileHooksListenerSettings } from '@my-many-books/shared-types';
import { API_BASE_URL } from '../../config/api';
import { MobileEventName } from './eventsSchema';

export interface MobileHookDBConfig {
  hooks_enabled: boolean;
  hook_listeners: {
    [eventType: string]: {
      enabled: boolean;
    };
  };
  config: MobileHooksListenerSettings;
}

export class MobileHookConfigService {
  private cachedConfig: MobileHookDBConfig | null = null;
  private lastCacheTime = 0;
  private userId: string | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Set the current user ID for user-specific configuration
   */
  setUserId(userId: string): void {
    this.userId = userId;
    // Clear cache when user changes to force refresh
    this.clearCache();
  }

  /**
   * Check if mobile hooks should be processed based on 3-Level Priority System
   * 
   * Level 1: Environment Variable (Highest Priority - Infrastructure)
   * Level 2: Database Configuration (Admin-Configurable)
   * Level 3: User-specific Configuration (Overrides global settings)
   * Level 4: Individual Hook/Listener Controls
   */
  async shouldProcessHooks(eventType?: MobileEventName): Promise<boolean> {
    // Level 1: Environment Variable (Highest Priority - Infrastructure)
    const envEnabled = process.env.EXPO_PUBLIC_HOOKS_ENABLED;
    if (envEnabled === 'false') {
      if (__DEV__) {
        console.log('[MobileHookConfig] Hooks disabled by environment variable (Level 1)');
      }
      return false; // Skip all hook processing - emergency kill switch
    }

    // Level 2: Database Configuration (Admin-Configurable)
    try {
      const dbConfig = await this.getMobileHookConfig();
      if (!dbConfig.hooks_enabled) {
        if (__DEV__) {
          console.log('[MobileHookConfig] Hooks disabled by database config (Level 2)');
        }
        return false; // Skip based on admin settings
      }

      // Level 3: User-specific Configuration (Overrides global settings)
      if (this.userId) {
        const userConfig = await this.getUserMobileConfig(this.userId);
        if (userConfig && !userConfig.hooks_enabled) {
          if (__DEV__) {
            console.log('[MobileHookConfig] Hooks disabled by user-specific config (Level 3)');
          }
          return false; // User has disabled hooks for themselves
        }

        // Check user-specific event type settings
        if (eventType && userConfig?.custom_hook_listeners?.[eventType] && !userConfig.custom_hook_listeners[eventType].enabled) {
          if (__DEV__) {
            console.log(`[MobileHookConfig] Hook '${eventType}' disabled by user settings (Level 3)`);
          }
          return false;
        }
      }

      // Level 4: Individual Hook/Listener Controls (if specific eventType provided)
      if (eventType && dbConfig.hook_listeners[eventType] && !dbConfig.hook_listeners[eventType].enabled) {
        if (__DEV__) {
          console.log(`[MobileHookConfig] Hook '${eventType}' disabled by admin settings (Level 4)`);
        }
        return false; // Skip specific hook based on admin settings
      }

      return true; // All checks passed
    } catch (error) {
      // If we can't get DB config, default to environment variable state
      if (__DEV__) {
        console.warn('[MobileHookConfig] Failed to get DB config, defaulting to env variable:', error);
      }
      return envEnabled !== 'false';
    }
  }

  /**
   * Get mobile hook configuration from API (with caching)
   */
  async getMobileHookConfig(): Promise<MobileHookDBConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.cachedConfig && (now - this.lastCacheTime) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      // Use fetch directly for simplicity (avoiding circular imports)
      const response = await fetch(`${API_BASE_URL}/config/mobile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Transform API response to expected format
      const config = responseData.config;
      const dbConfig: MobileHookDBConfig = {
        hooks_enabled: true, // Default to enabled if not specified
        hook_listeners: {
          // Map configuration to hook listener controls
          analytics: { enabled: config.analyticsEnabled },
          error_reporting: { enabled: config.errorReportingEnabled },
          offline_storage: { enabled: config.offlineStorageEnabled },
          performance_monitoring: { enabled: config.performanceMonitoringEnabled },
        },
        config
      };

      // Cache the result
      this.cachedConfig = dbConfig;
      this.lastCacheTime = now;

      if (__DEV__) {
        console.log('[MobileHookConfig] Fetched and cached mobile hook configuration');
      }

      return dbConfig;
    } catch (error) {
      if (__DEV__) {
        console.warn('[MobileHookConfig] Failed to fetch mobile hook config:', error);
      }
      
      // Return default safe configuration on error
      const defaultConfig: MobileHookDBConfig = {
        hooks_enabled: true,
        hook_listeners: {
          analytics: { enabled: true },
          error_reporting: { enabled: true },
          offline_storage: { enabled: true },
          performance_monitoring: { enabled: true },
        },
        config: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };
      
      return defaultConfig;
    }
  }

  /**
   * Get user-specific mobile configuration
   */
  private async getUserMobileConfig(userId: string): Promise<{
    hooks_enabled?: boolean;
    custom_hook_listeners?: { [key: string]: { enabled: boolean } };
  } | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/mobile-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User hasn't configured custom settings yet
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (__DEV__) {
        console.warn('[MobileHookConfig] Failed to fetch user config:', error);
      }
      return null; // Default to no user-specific overrides on error
    }
  }

  /**
   * Clear cached configuration (force refresh on next access)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastCacheTime = 0;
    if (__DEV__) {
      console.log('[MobileHookConfig] Configuration cache cleared');
    }
  }

  /**
   * Get current cache status for debugging
   */
  getCacheStatus(): { isCached: boolean; cacheAge: number; ttl: number } {
    const now = Date.now();
    const cacheAge = now - this.lastCacheTime;
    return {
      isCached: Boolean(this.cachedConfig),
      cacheAge,
      ttl: this.CACHE_TTL,
    };
  }
}

// Export singleton instance
export const mobileHookConfigService = new MobileHookConfigService();
