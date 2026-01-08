import { AppState } from 'react-native';
import { appLifecycleService } from '../AppLifecycleService';
import { mobileHooks, MOBILE_EVENTS } from '../../hooks/mobileHooks';

// Mock React Native AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

// Mock mobile hooks
jest.mock('../../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn(),
  },
  MOBILE_EVENTS: {
    APP: {
      STARTUP: 'APP.STARTUP',
      INITIALIZATION: {
        START: 'APP.INITIALIZATION.START',
        COMPLETE: 'APP.INITIALIZATION.COMPLETE',
      },
      FOREGROUND: 'APP.FOREGROUND',
      BACKGROUND: 'APP.BACKGROUND',
      ACTIVE: 'APP.ACTIVE',
      INACTIVE: 'APP.INACTIVE',
      TERMINATION: 'APP.TERMINATION',
      MEMORY_WARNING: 'APP.MEMORY_WARNING',
      SESSION: {
        START: 'APP.SESSION.START',
        END: 'APP.SESSION.END',
      },
    },
  },
}));

describe('AppLifecycleService', () => {
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    appLifecycleService.reset();
    
    mockRemove = jest.fn();
    mockAddEventListener = jest.mocked(AppState.addEventListener);
    mockAddEventListener.mockReturnValue({ remove: mockRemove });
  });

  afterEach(() => {
    appLifecycleService.reset();
  });

  describe('startMonitoring', () => {
    it('should start monitoring and emit startup events', () => {
      appLifecycleService.startMonitoring();

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.STARTUP,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: expect.any(String),
          appState: 'active',
          initialState: 'active',
        })
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.INITIALIZATION.START,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: expect.any(String),
          appState: 'active',
        })
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.SESSION.START,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: expect.any(String),
          appState: 'active',
        })
      );

      expect(appLifecycleService.isMonitoring()).toBe(true);
    });

    it('should not start monitoring twice', () => {
      appLifecycleService.startMonitoring();
      jest.clearAllMocks();

      appLifecycleService.startMonitoring();

      expect(mockAddEventListener).not.toHaveBeenCalled();
      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and emit termination events', () => {
      appLifecycleService.startMonitoring();
      const session = appLifecycleService.getCurrentSession();
      jest.clearAllMocks();

      appLifecycleService.stopMonitoring();

      expect(mockRemove).toHaveBeenCalled();
      
      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.SESSION.END,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: session?.sessionId,
          appState: 'active',
          sessionData: expect.objectContaining({
            sessionId: session?.sessionId,
            duration: expect.any(Number),
          }),
        })
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.TERMINATION,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: session?.sessionId,
          appState: 'active',
          finalSession: expect.any(Object),
        })
      );

      expect(appLifecycleService.isMonitoring()).toBe(false);
    });

    it('should handle stop when not monitoring', () => {
      appLifecycleService.stopMonitoring();

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('markInitializationComplete', () => {
    it('should emit initialization complete event when monitoring', () => {
      appLifecycleService.startMonitoring();
      const session = appLifecycleService.getCurrentSession();
      jest.clearAllMocks();

      appLifecycleService.markInitializationComplete();

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.INITIALIZATION.COMPLETE,
        expect.objectContaining({
          timestamp: expect.any(Number),
          sessionId: session?.sessionId,
          appState: 'active',
          sessionDuration: expect.any(Number),
        })
      );
    });

    it('should not emit event when not monitoring', () => {
      appLifecycleService.markInitializationComplete();

      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('app state change handling', () => {
    let appStateChangeHandler: (state: string) => void;

    beforeEach(() => {
      appLifecycleService.startMonitoring();
      appStateChangeHandler = mockAddEventListener.mock.calls[0][1];
      jest.clearAllMocks();
    });

    it('should emit ACTIVE event when app becomes active', () => {
      appStateChangeHandler('active');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.ACTIVE,
        expect.objectContaining({
          timestamp: expect.any(Number),
          appState: 'active',
          previousState: 'active',
          sessionDuration: expect.any(Number),
        })
      );
    });

    it('should emit BACKGROUND event when app goes to background', () => {
      appStateChangeHandler('background');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.BACKGROUND,
        expect.objectContaining({
          timestamp: expect.any(Number),
          appState: 'background',
          previousState: 'active',
          sessionDuration: expect.any(Number),
        })
      );
    });

    it('should emit FOREGROUND event when returning from background', () => {
      // First go to background
      appStateChangeHandler('background');
      jest.clearAllMocks();

      // Then back to active
      appStateChangeHandler('active');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.ACTIVE,
        expect.any(Object)
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.FOREGROUND,
        expect.objectContaining({
          timestamp: expect.any(Number),
          appState: 'active',
          previousState: 'background',
          backgroundDuration: expect.any(Number),
        })
      );
    });

    it('should emit INACTIVE event when app becomes inactive', () => {
      appStateChangeHandler('inactive');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.APP.INACTIVE,
        expect.objectContaining({
          timestamp: expect.any(Number),
          appState: 'inactive',
          previousState: 'active',
          sessionDuration: expect.any(Number),
        })
      );
    });

    it('should track session state changes', () => {
      const initialSession = appLifecycleService.getCurrentSession();
      const initialChangeCount = initialSession?.appStateChanges || 0;

      appStateChangeHandler('background');
      appStateChangeHandler('active');

      const updatedSession = appLifecycleService.getCurrentSession();
      expect(updatedSession?.appStateChanges).toBe(initialChangeCount + 2);
    });
  });

  describe('session management', () => {
    it('should create a session when monitoring starts', () => {
      expect(appLifecycleService.getCurrentSession()).toBeNull();

      appLifecycleService.startMonitoring();

      const session = appLifecycleService.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(session?.startTime).toBeGreaterThan(0);
      expect(session?.appStateChanges).toBe(0);
      expect(session?.backgroundDuration).toBe(0);
    });

    it('should end session when monitoring stops', () => {
      appLifecycleService.startMonitoring();
      const _session = appLifecycleService.getCurrentSession();
      
      appLifecycleService.stopMonitoring();

      expect(appLifecycleService.getCurrentSession()).toBeNull();
      // Session should have been ended in the termination event
    });
  });

  describe('getCurrentAppState', () => {
    it('should return current app state', () => {
      expect(appLifecycleService.getCurrentAppState()).toBe('unknown');

      appLifecycleService.startMonitoring();
      
      expect(appLifecycleService.getCurrentAppState()).toBe('active');
    });
  });
});