// ================================================================
// src/services/__tests__/mobileHookConfigService.priority.test.ts
// Test user-specific settings override global settings
// ================================================================

import { MobileHookConfigService } from '../hooks/mobileHookConfigService';
import { API_BASE_URL } from '../../config/api';

// Mock fetch for testing
global.fetch = jest.fn();

describe('MobileHookConfigService Priority System', () => {
  let service: MobileHookConfigService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new MobileHookConfigService();
    mockFetch.mockClear();
    service.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User-specific settings override global settings', () => {
    it('should respect user-disabled hooks even when global config enables them', async () => {
      service.setUserId('user123');

      // Mock global config - hooks enabled globally
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            config: {
              analyticsEnabled: true,
              errorReportingEnabled: true,
              offlineStorageEnabled: true,
              performanceMonitoringEnabled: true,
              batchUploadInterval: 300,
              maxOfflineEvents: 1000,
            }
          })
        } as Response)
        // Mock user config - hooks disabled for this user
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hooks_enabled: false, // User has disabled hooks
            custom_hook_listeners: {}
          })
        } as Response);

      const shouldProcess = await service.shouldProcessHooks();
      
      expect(shouldProcess).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, `${API_BASE_URL}/config/mobile`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      expect(mockFetch).toHaveBeenNthCalledWith(2, `${API_BASE_URL}/users/user123/mobile-config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    it('should allow hooks when global disabled but user enables via user config', async () => {
      service.setUserId('user456');

      // Mock global config - hooks disabled globally
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            config: {
              analyticsEnabled: false,
              errorReportingEnabled: false,
              offlineStorageEnabled: false,
              performanceMonitoringEnabled: false,
              batchUploadInterval: 300,
              maxOfflineEvents: 1000,
            }
          })
        } as Response)
        // Mock user config - hooks enabled for this user (overrides global)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hooks_enabled: true, // User has enabled hooks despite global disabled
            custom_hook_listeners: {}
          })
        } as Response);

      const shouldProcess = await service.shouldProcessHooks();
      
      // Should still be false because global DB config has hooks_enabled: false (defaulted in transformation)
      // But let's test the user-specific event override
      expect(shouldProcess).toBe(true);
    });

    it('should respect user-specific event type settings', async () => {
      service.setUserId('user789');

      // Mock global config - all hooks enabled
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            config: {
              analyticsEnabled: true,
              errorReportingEnabled: true,
              offlineStorageEnabled: true,
              performanceMonitoringEnabled: true,
              batchUploadInterval: 300,
              maxOfflineEvents: 1000,
            }
          })
        } as Response)
        // Mock user config - specific hook disabled
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            hooks_enabled: true,
            custom_hook_listeners: {
              'analytics': { enabled: false }, // User disabled analytics specifically
              'error_reporting': { enabled: true }
            }
          })
        } as Response);

      const shouldProcessAnalytics = await service.shouldProcessHooks('analytics');
      const shouldProcessErrors = await service.shouldProcessHooks('error_reporting');
      
      expect(shouldProcessAnalytics).toBe(false); // User disabled analytics
      expect(shouldProcessErrors).toBe(true);     // User allows error reporting
    });

    it('should handle missing user config gracefully', async () => {
      service.setUserId('newuser');

      // Mock global config - hooks enabled
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            config: {
              analyticsEnabled: true,
              errorReportingEnabled: true,
              offlineStorageEnabled: true,
              performanceMonitoringEnabled: true,
              batchUploadInterval: 300,
              maxOfflineEvents: 1000,
            }
          })
        } as Response)
        // Mock 404 for user config (user hasn't configured custom settings)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        } as Response);

      const shouldProcess = await service.shouldProcessHooks();
      
      // Should fall back to global config (enabled)
      expect(shouldProcess).toBe(true);
    });

    it('should handle user config fetch errors gracefully', async () => {
      service.setUserId('erroruser');

      // Mock global config - hooks enabled
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            config: {
              analyticsEnabled: true,
              errorReportingEnabled: true,
              offlineStorageEnabled: true,
              performanceMonitoringEnabled: true,
              batchUploadInterval: 300,
              maxOfflineEvents: 1000,
            }
          })
        } as Response)
        // Mock network error for user config
        .mockRejectedValueOnce(new Error('Network error'));

      const shouldProcess = await service.shouldProcessHooks();
      
      // Should fall back to global config (enabled)
      expect(shouldProcess).toBe(true);
    });
  });

  describe('Environment variable override (Level 1)', () => {
    const originalEnv = process.env.EXPO_PUBLIC_HOOKS_ENABLED;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.EXPO_PUBLIC_HOOKS_ENABLED;
      } else {
        process.env.EXPO_PUBLIC_HOOKS_ENABLED = originalEnv;
      }
    });

    it('should respect environment variable override even with user config', async () => {
      process.env.EXPO_PUBLIC_HOOKS_ENABLED = 'false';
      service.setUserId('user123');

      const shouldProcess = await service.shouldProcessHooks();
      
      // Should be false due to environment variable, no API calls should be made
      expect(shouldProcess).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Cache behavior with user changes', () => {
    it('should clear cache when user ID changes', async () => {
      service.setUserId('user1');
      
      // Mock first user config
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          config: {
            analyticsEnabled: true,
            errorReportingEnabled: true,
            offlineStorageEnabled: true,
            performanceMonitoringEnabled: true,
            batchUploadInterval: 300,
            maxOfflineEvents: 1000,
          }
        })
      } as Response);

      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Call again - should use cache
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Change user ID - should clear cache
      service.setUserId('user2');
      
      // Mock new config fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          config: {
            analyticsEnabled: false,
            errorReportingEnabled: false,
            offlineStorageEnabled: false,
            performanceMonitoringEnabled: false,
            batchUploadInterval: 300,
            maxOfflineEvents: 1000,
          }
        })
      } as Response);

      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Cache was cleared, new fetch made
    });
  });
});
