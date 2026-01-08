// ================================================================
// __tests__/mobileHookListeners.test.ts
// Tests for mobile hook listeners system
// ================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileHookListenersManager, MobileHookListenerConfig } from '../mobileHookListeners';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('MobileHookListenersManager', () => {
  let listenersManager: MobileHookListenersManager;
  let defaultConfig: MobileHookListenerConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    // Default configuration
    defaultConfig = {
      analyticsEnabled: true,
      errorReportingEnabled: true,
      offlineStorageEnabled: true,
      performanceMonitoringEnabled: true,
      batchUploadInterval: 300,
      maxOfflineEvents: 1000,
    };

    listenersManager = new MobileHookListenersManager(defaultConfig);
  });

  describe('initialization', () => {
    it('should create listeners manager with default config', () => {
      const manager = new MobileHookListenersManager();
      const config = manager.getConfig();
      
      expect(config.analyticsEnabled).toBe(true);
      expect(config.errorReportingEnabled).toBe(true);
      expect(config.offlineStorageEnabled).toBe(true);
      expect(config.performanceMonitoringEnabled).toBe(true);
    });

    it('should create listeners manager with custom config', () => {
      const customConfig = {
        analyticsEnabled: false,
        errorReportingEnabled: true,
        maxOfflineEvents: 500,
      };

      const manager = new MobileHookListenersManager(customConfig);
      const config = manager.getConfig();
      
      expect(config.analyticsEnabled).toBe(false);
      expect(config.errorReportingEnabled).toBe(true);
      expect(config.maxOfflineEvents).toBe(500);
    });
  });

  describe('listener registration', () => {
    it('should have correct listener configuration', () => {
      const config = listenersManager.getConfig();
      
      expect(config.analyticsEnabled).toBe(true);
      expect(config.errorReportingEnabled).toBe(true);
      expect(config.offlineStorageEnabled).toBe(true);
      expect(config.performanceMonitoringEnabled).toBe(true);
    });

    it('should support partial configuration', () => {
      const partialConfig = {
        analyticsEnabled: false,
        errorReportingEnabled: true,
        maxOfflineEvents: 500,
      };

      const manager = new MobileHookListenersManager(partialConfig);
      const config = manager.getConfig();
      
      expect(config.analyticsEnabled).toBe(false);
      expect(config.errorReportingEnabled).toBe(true);
      expect(config.maxOfflineEvents).toBe(500);
      expect(config.offlineStorageEnabled).toBe(true); // should use default
    });
  });

  describe('analytics listener', () => {
    it('should handle analytics events directly', async () => {
      const analyticsListener = listenersManager['analyticsListener'];
      
      await analyticsListener.handleEvent('book.create.success', { 
        bookId: 'test-123', 
        title: 'Test Book' 
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_events',
        expect.stringContaining('book.create.success')
      );
    });

    it('should limit stored analytics events', async () => {
      const analyticsListener = listenersManager['analyticsListener'];
      
      // Mock existing events at max limit
      const existingEvents = Array(1000).fill({
        eventType: 'existing.event',
        data: {},
        timestamp: new Date().toISOString(),
        category: 'user_behavior',
      });

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingEvents));

      await analyticsListener.handleEvent('new.event', { test: 'data' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_events',
        expect.any(String)
      );

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1000); // Should still be at max limit
    });
  });

  describe('error reporting listener', () => {
    it('should handle error events directly', async () => {
      const errorReportingListener = listenersManager['errorReportingListener'];
      
      await errorReportingListener.handleEvent('error.unhandled', { 
        message: 'Test error', 
        stack: 'Error stack trace' 
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'error_events',
        expect.stringContaining('error.unhandled')
      );
    });

    it('should ignore non-error events', async () => {
      const errorReportingListener = listenersManager['errorReportingListener'];
      
      await errorReportingListener.handleEvent('book.create.success', { 
        bookId: 'test-123' 
      });

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        'error_events',
        expect.any(String)
      );
    });

    it('should assign correct error severity', async () => {
      const errorReportingListener = listenersManager['errorReportingListener'];
      
      await errorReportingListener.handleEvent('error.unhandled', { test: 'data' });
      await errorReportingListener.handleEvent('error.network', { test: 'data' });
      await errorReportingListener.handleEvent('error.validation', { test: 'data' });

      const calls = mockAsyncStorage.setItem.mock.calls.filter(
        call => call[0] === 'error_events'
      );

      expect(calls).toHaveLength(3);
      
      const savedData1 = JSON.parse(calls[0][1]);
      const savedData2 = JSON.parse(calls[1][1]);
      const savedData3 = JSON.parse(calls[2][1]);

      expect(savedData1[0].severity).toBe('critical');
      expect(savedData2[0].severity).toBe('high');
      expect(savedData3[0].severity).toBe('medium');
    });
  });

  describe('offline storage listener', () => {
    it('should store all events for offline processing', async () => {
      const offlineStorageListener = listenersManager['offlineStorageListener'];
      
      await offlineStorageListener.handleEvent('book.create.success', { 
        bookId: 'test-123' 
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_events',
        expect.stringContaining('book.create.success')
      );
    });

    it('should include session information in stored events', async () => {
      const offlineStorageListener = listenersManager['offlineStorageListener'];
      
      await offlineStorageListener.handleEvent('test.event', { test: 'data' });

      const savedCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'offline_events'
      );

      expect(savedCall).toBeDefined();
      const savedData = JSON.parse(savedCall![1]);
      
      expect(savedData[0]).toEqual(
        expect.objectContaining({
          eventType: 'test.event',
          data: { test: 'data' },
          sessionId: expect.any(String),
          environment: 'mobile',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('performance monitoring listener', () => {
    it('should track operation start times', async () => {
      const performanceListener = listenersManager['performanceMonitoringListener'];
      
      await performanceListener.handleEvent('book.create.START', { bookId: 'test-123' });
      
      // Should not store performance metrics yet - just tracking start time
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        'performance_metrics',
        expect.any(String)
      );
    });

    it('should handle performance metric events', async () => {
      const performanceListener = listenersManager['performanceMonitoringListener'];
      
      await performanceListener.handleEvent('executor.PERFORMANCE_METRIC', {
        operationType: 'sync',
        duration: 1500,
        operationCount: 50,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'performance_metrics',
        expect.stringContaining('executor.PERFORMANCE_METRIC')
      );
    });
  });

  describe('stored events management', () => {
    it('should retrieve stored events by category', async () => {
      const testEvents = [
        { eventType: 'test.event', data: {}, timestamp: new Date().toISOString() }
      ];
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(testEvents));

      const events = await listenersManager.getStoredEvents('analytics');

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('analytics_events');
      expect(events).toEqual(testEvents);
    });

    it('should return empty array if no stored events', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      const events = await listenersManager.getStoredEvents('analytics');

      expect(events).toEqual([]);
    });

    it('should clear stored events by category', async () => {
      await listenersManager.clearStoredEvents('analytics');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('analytics_events');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { analyticsEnabled: false, maxOfflineEvents: 500 };
      
      listenersManager.updateConfig(newConfig);
      const config = listenersManager.getConfig();

      expect(config.analyticsEnabled).toBe(false);
      expect(config.maxOfflineEvents).toBe(500);
      expect(config.errorReportingEnabled).toBe(true); // Should retain other settings
    });

    it('should return current configuration', () => {
      const config = listenersManager.getConfig();

      expect(config).toEqual(defaultConfig);
    });
  });

  describe('error handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      const analyticsListener = listenersManager['analyticsListener'];

      // Mock AsyncStorage to throw error
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error - graceful degradation
      await expect(analyticsListener.handleEvent('test.event', {})).resolves.toBeUndefined();
    });

    it('should handle listener configuration properly', () => {
      const disabledConfig = {
        analyticsEnabled: false,
        errorReportingEnabled: false,
        offlineStorageEnabled: false,
        performanceMonitoringEnabled: false,
        batchUploadInterval: 300,
        maxOfflineEvents: 1000,
      };

      const manager = new MobileHookListenersManager(disabledConfig);
      expect(manager.getConfig().analyticsEnabled).toBe(false);
    });
  });
});