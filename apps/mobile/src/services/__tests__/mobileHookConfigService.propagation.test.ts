// ================================================================
// src/services/__tests__/mobileHookConfigService.propagation.test.ts
// Test configuration changes propagate correctly
// ================================================================

import { MobileHookConfigService } from '../hooks/mobileHookConfigService';
import { HOOK_LISTENER_CATEGORIES } from '@my-many-books/shared-types';

// Mock fetch for testing
global.fetch = jest.fn();

describe('MobileHookConfigService Configuration Propagation', () => {
  let service: MobileHookConfigService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new MobileHookConfigService();
    mockFetch.mockClear();
    service.clearCache();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Cache TTL and configuration updates', () => {
    it('should cache configuration for TTL duration', async () => {
      const mockConfig = {
        config: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig)
      } as Response);

      // First call - should fetch from API
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call within TTL - should use cache
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 4 minutes (less than 5 minute TTL)
      jest.advanceTimersByTime(4 * 60 * 1000);

      // Third call - still within TTL, should use cache
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time by 2 more minutes (total 6 minutes, exceeds 5 minute TTL)
      jest.advanceTimersByTime(2 * 60 * 1000);

      // Fourth call - TTL expired, should fetch from API
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should immediately refresh cache when clearCache is called', async () => {
      const mockConfig1 = {
        config: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };

      const mockConfig2 = {
        config: {
          analyticsEnabled: false,
          errorReportingEnabled: false,
          offlineStorageEnabled: false,
          performanceMonitoringEnabled: false,
          batchUploadInterval: 600,
          maxOfflineEvents: 2000,
        }
      };

      // First call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig1)
      } as Response);

      const config1 = await service.getMobileHookConfig();
      expect(config1.config.analyticsEnabled).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache to simulate configuration update
      service.clearCache();

      // Next call should fetch new config
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfig2)
      } as Response);

      const config2 = await service.getMobileHookConfig();
      expect(config2.config.analyticsEnabled).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration change detection', () => {
    it('should handle configuration changes between fetches', async () => {
      service.setUserId('testuser');

      // Initial configuration
      const initialConfig = {
        config: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };

      const initialUserConfig = {
        hooks_enabled: true,
        custom_hook_listeners: {
          [HOOK_LISTENER_CATEGORIES.ANALYTICS]: { enabled: true }
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialConfig)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialUserConfig)
        } as Response);

      // Initial check - should process hooks
      const shouldProcess1 = await service.shouldProcessHooks(HOOK_LISTENER_CATEGORIES.ANALYTICS);
      expect(shouldProcess1).toBe(true);

      // Clear cache to simulate admin updating configuration
      service.clearCache();

      // Updated configuration - admin disabled analytics
      const updatedConfig = {
        config: {
          analyticsEnabled: false, // Changed by admin
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedConfig)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(initialUserConfig)
        } as Response);

      // Second check - should now respect admin's analytics disable
      const shouldProcess2 = await service.shouldProcessHooks(HOOK_LISTENER_CATEGORIES.ANALYTICS);
      expect(shouldProcess2).toBe(false); // Analytics disabled in global config
    });
  });

  describe('User ID change propagation', () => {
    it('should immediately clear cache when user ID changes', async () => {
      // Set up initial user
      service.setUserId('user1');

      const config1 = {
        config: {
          analyticsEnabled: true,
          errorReportingEnabled: true,
          offlineStorageEnabled: true,
          performanceMonitoringEnabled: true,
          batchUploadInterval: 300,
          maxOfflineEvents: 1000,
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(config1)
      } as Response);

      // Fetch config for user1
      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify cache status
      const cacheStatus1 = service.getCacheStatus();
      expect(cacheStatus1.isCached).toBe(true);

      // Change user ID - should clear cache
      service.setUserId('user2');

      // Verify cache was cleared
      const cacheStatus2 = service.getCacheStatus();
      expect(cacheStatus2.isCached).toBe(false);
      expect(cacheStatus2.cacheAge).toBeGreaterThan(0); // Age relative to epoch since lastCacheTime reset to 0

      // Next config fetch should make new API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(config1)
      } as Response);

      await service.getMobileHookConfig();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache status debugging', () => {
    it('should provide accurate cache status information', async () => {
      // Initially no cache
      const initialStatus = service.getCacheStatus();
      expect(initialStatus.isCached).toBe(false);
      expect(initialStatus.cacheAge).toBeGreaterThan(0); // Age relative to epoch since lastCacheTime=0
      expect(initialStatus.ttl).toBe(5 * 60 * 1000); // 5 minutes

      // Mock config fetch
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

      // Fetch config
      await service.getMobileHookConfig();

      // Check cache status after fetch
      const afterFetchStatus = service.getCacheStatus();
      expect(afterFetchStatus.isCached).toBe(true);
      expect(afterFetchStatus.cacheAge).toBeLessThan(100); // Just fetched, should be very small
      expect(afterFetchStatus.ttl).toBe(5 * 60 * 1000);

      // Advance time and check age
      jest.advanceTimersByTime(2 * 60 * 1000); // 2 minutes

      const afterTimeStatus = service.getCacheStatus();
      expect(afterTimeStatus.isCached).toBe(true);
      expect(afterTimeStatus.cacheAge).toBeGreaterThanOrEqual(2 * 60 * 1000 - 100); // 2 minutes old (with some tolerance)
      expect(afterTimeStatus.cacheAge).toBeLessThanOrEqual(2 * 60 * 1000 + 100);
    });
  });

  describe('Error recovery and propagation', () => {
    it('should handle API errors gracefully and not cache invalid responses', async () => {
      // First call - API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config1 = await service.getMobileHookConfig();
      
      // Should return default config on error
      expect(config1.hooks_enabled).toBe(true);
      expect(config1.config.analyticsEnabled).toBe(true);
      
      // Cache should not be set for error responses
      const cacheStatus = service.getCacheStatus();
      expect(cacheStatus.isCached).toBe(false);

      // Second call - API returns valid response
      const validConfig = {
        config: {
          analyticsEnabled: false,
          errorReportingEnabled: false,
          offlineStorageEnabled: false,
          performanceMonitoringEnabled: false,
          batchUploadInterval: 600,
          maxOfflineEvents: 2000,
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(validConfig)
      } as Response);

      const config2 = await service.getMobileHookConfig();
      expect(config2.config.analyticsEnabled).toBe(false);
      
      // Now cache should be set
      const cacheStatus2 = service.getCacheStatus();
      expect(cacheStatus2.isCached).toBe(true);
    });
  });
});