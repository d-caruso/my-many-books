// ================================================================
// __tests__/mobileHookListeners.test.ts
// Tests for mobile hook listeners system
// ================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HookSystem, InMemoryHookStorage } from '@my-many-books/hookey';
import { MobileHookListenersManager, MobileHookListenerConfig } from '../mobileHookListeners';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('MobileHookListenersManager', () => {
  let hookSystem: HookSystem;
  let listenersManager: MobileHookListenersManager;
  let defaultConfig: MobileHookListenerConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AsyncStorage mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);

    // Create hook system with in-memory storage
    const storage = new InMemoryHookStorage();
    hookSystem = new HookSystem(storage);

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
    it('should register all enabled listeners', async () => {
      await listenersManager.registerListeners(hookSystem);

      // Check that hooks were registered in the storage
      const hooks = await hookSystem['storage'].getHooks();
      
      expect(hooks).toHaveLength(4); // analytics, error reporting, offline storage, performance
      expect(hooks.map(h => h.actionType)).toEqual(
        expect.arrayContaining(['analytics', 'error_reporting', 'offline_storage', 'performance_monitoring'])
      );
    });

    it('should only register enabled listeners', async () => {
      const partialConfig = {
        analyticsEnabled: true,
        errorReportingEnabled: false,
        offlineStorageEnabled: true,
        performanceMonitoringEnabled: false,
        batchUploadInterval: 300,
        maxOfflineEvents: 1000,
      };

      const manager = new MobileHookListenersManager(partialConfig);
      await manager.registerListeners(hookSystem);

      const hooks = await hookSystem['storage'].getHooks();
      
      expect(hooks).toHaveLength(2); // only analytics and offline storage
      expect(hooks.map(h => h.actionType)).toEqual(
        expect.arrayContaining(['analytics', 'offline_storage'])
      );
    });
  });

  describe('analytics listener', () => {
    beforeEach(async () => {
      await listenersManager.registerListeners(hookSystem);
    });

    it('should handle analytics events', async () => {
      const testEventType = 'book.create.success';
      const testData = { bookId: 'test-123', title: 'Test Book' };

      await hookSystem.trigger(testEventType, testData);

      // Wait for async listeners to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify analytics event was stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_events',
        expect.stringContaining(testEventType)
      );
    });

    it('should limit stored analytics events', async () => {
      // Mock existing events at max limit
      const existingEvents = Array(1000).fill({
        eventType: 'existing.event',
        data: {},
        timestamp: new Date().toISOString(),
        category: 'user_behavior',
      });

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingEvents));

      await hookSystem.trigger('new.event', { test: 'data' });

      // Wait for async listeners to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that old events were removed to make room for new one
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'analytics_events',
        expect.any(String)
      );

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1000); // Should still be at max limit
    });
  });

  describe('error reporting listener', () => {
    beforeEach(async () => {
      await listenersManager.registerListeners(hookSystem);
    });

    it('should handle error events', async () => {
      const testEventType = 'error.unhandled';
      const testData = { message: 'Test error', stack: 'Error stack trace' };

      await hookSystem.trigger(testEventType, testData);

      // Wait for async listeners to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error event was stored
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'error_events',
        expect.stringContaining(testEventType)
      );
    });

    it('should ignore non-error events', async () => {
      const testEventType = 'book.create.success';
      const testData = { bookId: 'test-123' };

      await hookSystem.trigger(testEventType, testData);

      // Verify error events storage was not called for non-error event
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        'error_events',
        expect.any(String)
      );
    });

    it('should assign correct error severity', async () => {
      await hookSystem.trigger('error.unhandled', { test: 'data' });
      await hookSystem.trigger('error.network', { test: 'data' });
      await hookSystem.trigger('error.validation', { test: 'data' });

      const calls = mockAsyncStorage.setItem.mock.calls.filter(
        call => call[0] === 'error_events'
      );

      expect(calls).toHaveLength(3);
      
      // Check that different severity levels are assigned
      const savedData1 = JSON.parse(calls[0][1]);
      const savedData2 = JSON.parse(calls[1][1]);
      const savedData3 = JSON.parse(calls[2][1]);

      expect(savedData1[0].severity).toBe('critical');
      expect(savedData2[0].severity).toBe('high');
      expect(savedData3[0].severity).toBe('medium');
    });
  });

  describe('offline storage listener', () => {
    beforeEach(async () => {
      await listenersManager.registerListeners(hookSystem);
    });

    it('should store all events for offline processing', async () => {
      const testEventType = 'book.create.success';
      const testData = { bookId: 'test-123' };

      await hookSystem.trigger(testEventType, testData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_events',
        expect.stringContaining(testEventType)
      );
    });

    it('should include session information in stored events', async () => {
      await hookSystem.trigger('test.event', { test: 'data' });

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
    beforeEach(async () => {
      await listenersManager.registerListeners(hookSystem);
    });

    it('should track operation start times', async () => {
      await hookSystem.trigger('book.create.start', { bookId: 'test-123' });
      
      // No storage call yet - just tracking start time
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        'performance_metrics',
        expect.any(String)
      );
    });

    it('should calculate operation duration on completion', async () => {
      // Start operation
      await hookSystem.trigger('book.create.start', { bookId: 'test-123' });
      
      // Wait a bit to simulate operation time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Complete operation
      await hookSystem.trigger('book.create.success', { bookId: 'test-123' });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'performance_metrics',
        expect.stringContaining('book.create.PERFORMANCE_METRIC')
      );

      const savedCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'performance_metrics'
      );
      
      const savedData = JSON.parse(savedCall![1]);
      expect(savedData[0].data.duration).toBeGreaterThanOrEqual(10);
    });

    it('should handle performance metric events', async () => {
      await hookSystem.trigger('executor.performance_metric', {
        operationType: 'sync',
        duration: 1500,
        operationCount: 50,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'performance_metrics',
        expect.stringContaining('executor.performance_metric')
      );
    });
  });

  describe('stored events management', () => {
    beforeEach(async () => {
      await listenersManager.registerListeners(hookSystem);
    });

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
      await listenersManager.registerListeners(hookSystem);

      // Mock AsyncStorage to throw error
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      // Should not throw error - graceful degradation
      await expect(hookSystem.trigger('test.event', {})).resolves.toBeUndefined();
    });

    it('should continue without listeners if registration fails', async () => {
      // Create invalid hook system that will cause registration to fail
      const invalidHookSystem = new HookSystem(new InMemoryHookStorage());
      
      // Mock registerHook to throw error
      jest.spyOn(invalidHookSystem, 'registerHook').mockRejectedValueOnce(new Error('Registration failed'));

      await expect(listenersManager.registerListeners(invalidHookSystem)).rejects.toThrow();
    });
  });
});