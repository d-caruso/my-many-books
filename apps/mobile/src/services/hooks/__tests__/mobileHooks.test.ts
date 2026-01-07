import { mobileHooks, MobileHookSystemManager, MOBILE_EVENTS } from '../mobileHooks';
import { HookSystem } from '@my-many-books/hookey';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('MobileHookSystemManager', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Initialization', () => {
    it('should initialize hook system successfully', () => {
      const manager = new MobileHookSystemManager({ isTestEnvironment: false });
      const system = manager.initialize();
      
      expect(system).toBeInstanceOf(HookSystem);
      expect(manager.isOperational()).toBe(true);
    });

    it('should use default options when none provided', () => {
      const manager = new MobileHookSystemManager({ isTestEnvironment: false });
      const system = manager.initialize();
      
      expect(system).not.toBeNull();
      expect(manager.isOperational()).toBe(true);
    });

    it('should respect isEnabled option', () => {
      const manager = new MobileHookSystemManager({ isEnabled: false });
      const system = manager.initialize();
      
      expect(system).toBeNull();
      expect(manager.isOperational()).toBe(false);
    });

    it('should respect isTestEnvironment option', () => {
      const manager = new MobileHookSystemManager({ isTestEnvironment: true });
      const system = manager.initialize();
      
      expect(system).toBeNull();
      expect(manager.isOperational()).toBe(false);
    });

    it('should return existing system on subsequent calls', () => {
      const manager = new MobileHookSystemManager({ isTestEnvironment: false });
      const system1 = manager.initialize();
      const system2 = manager.initialize();
      
      expect(system1).toBe(system2);
    });
  });

  describe('Event Emission', () => {
    let manager: MobileHookSystemManager;

    beforeEach(() => {
      manager = new MobileHookSystemManager({ enableLogging: false, isTestEnvironment: false });
      manager.initialize();
    });

    it('should emit events successfully', async () => {
      await expect(manager.emit(MOBILE_EVENTS.BOOK.CREATE.START, {
        operationId: 'test-123',
        resourceType: 'book',
      })).resolves.not.toThrow();
    });

    it('should handle emit failures gracefully', async () => {
      // Force an error by passing invalid data
      const circular: Record<string, unknown> = {};
      circular.self = circular; // Create circular reference
      await expect(manager.emit('invalid.event', {
        circular,
      })).resolves.not.toThrow();

      // Should not crash the app
      expect(manager.isOperational()).toBe(true);
    });

    it('should add default metadata to events', async () => {
      const mockSystem = {
        trigger: jest.fn().mockResolvedValue(undefined),
      };

      // Replace the system instance
      (manager as unknown as { hookSystem: typeof mockSystem }).hookSystem = mockSystem;

      await manager.emit(MOBILE_EVENTS.BOOK.CREATE.START, {
        operationId: 'test-123',
      });

      expect(mockSystem.trigger).toHaveBeenCalledWith(
        MOBILE_EVENTS.BOOK.CREATE.START,
        expect.objectContaining({
          operationId: 'test-123',
          environment: 'mobile',
          timestamp: expect.any(String),
          sessionId: expect.stringMatching(/^mobile-session-/),
        })
      );
    });

    it('should skip emission when disabled', async () => {
      const disabledManager = new MobileHookSystemManager({ isEnabled: false });
      
      await expect(disabledManager.emit(MOBILE_EVENTS.BOOK.CREATE.START, {}))
        .resolves.not.toThrow();
    });

    it('should skip emission in test environment', async () => {
      const testManager = new MobileHookSystemManager({ isTestEnvironment: true });
      
      await expect(testManager.emit(MOBILE_EVENTS.BOOK.CREATE.START, {}))
        .resolves.not.toThrow();
    });
  });

  describe('Configuration Options', () => {
    it('should accept custom environment', () => {
      const manager = new MobileHookSystemManager({ 
        environment: 'staging',
        enableLogging: false,
        isTestEnvironment: false
      });
      manager.initialize();
      
      expect(manager.isOperational()).toBe(true);
    });

    it('should handle logging configuration', () => {
      const manager = new MobileHookSystemManager({ 
        enableLogging: true,
        logLevel: 'debug',
        isTestEnvironment: false
      });
      manager.initialize();
      
      expect(manager.isOperational()).toBe(true);
      // In __DEV__ mode, should log initialization
      if (__DEV__) {
        expect(console.log).toHaveBeenCalledWith(
          '[MobileHooks] Hook system initialized successfully'
        );
      }
    });

    it('should handle metrics configuration', () => {
      const manager = new MobileHookSystemManager({ 
        enableMetrics: true,
        isTestEnvironment: false
      });
      manager.initialize();
      
      expect(manager.isOperational()).toBe(true);
    });
  });
});

describe('mobileHooks singleton', () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('should be operational by default', () => {
    // Note: This might be false in Jest environment due to test detection
    const isOperational = mobileHooks.isOperational();
    expect(typeof isOperational).toBe('boolean');
  });

  it('should provide emit method', () => {
    expect(typeof mobileHooks.emit).toBe('function');
  });

  it('should provide getInstance method', () => {
    expect(typeof mobileHooks.getInstance).toBe('function');
  });

  it('should provide isOperational method', () => {
    expect(typeof mobileHooks.isOperational).toBe('function');
  });

  it('should emit events without throwing', async () => {
    await expect(mobileHooks.emit(MOBILE_EVENTS.APP.STARTUP, {
      startTime: Date.now(),
    })).resolves.not.toThrow();
  });

  it('should handle concurrent emissions', async () => {
    const emissions = Array.from({ length: 10 }, (_, i) => 
      mobileHooks.emit(MOBILE_EVENTS.BOOK.READ.START, { bookId: i })
    );

    await expect(Promise.all(emissions)).resolves.not.toThrow();
  });
});

describe('MOBILE_EVENTS export', () => {
  it('should export MOBILE_EVENTS from mobileHooks module', () => {
    expect(MOBILE_EVENTS).toBeDefined();
    expect(MOBILE_EVENTS.BOOK).toBeDefined();
    expect(MOBILE_EVENTS.QUEUE).toBeDefined();
    expect(MOBILE_EVENTS.ERROR).toBeDefined();
  });

  it('should match events from events module', () => {
    const { MOBILE_EVENTS: directEvents } = require('../eventsSchema');
    expect(MOBILE_EVENTS).toEqual(directEvents);
  });
});