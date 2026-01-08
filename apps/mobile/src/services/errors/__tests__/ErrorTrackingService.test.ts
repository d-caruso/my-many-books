import { errorTrackingService } from '../ErrorTrackingService';
import { mobileHooks, MOBILE_EVENTS } from '../../hooks/mobileHooks';
import { appLifecycleService } from '../../lifecycle/AppLifecycleService';
import { networkService } from '../../network/NetworkService';

// Mock dependencies
jest.mock('../../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn(),
  },
  MOBILE_EVENTS: {
    ERROR: {
      UNHANDLED: 'ERROR.UNHANDLED',
      PROMISE_REJECTION: 'ERROR.PROMISE_REJECTION',
      REACT_NATIVE: 'ERROR.REACT_NATIVE',
      USER_FACING: 'ERROR.USER_FACING',
      RECOVERED: 'ERROR.RECOVERED',
      TRACKING_START: 'ERROR.TRACKING_START',
      TRACKING_STOP: 'ERROR.TRACKING_STOP',
    },
  },
}));

jest.mock('../../lifecycle/AppLifecycleService', () => ({
  appLifecycleService: {
    getCurrentSession: jest.fn(),
    getCurrentAppState: jest.fn(),
  },
}));

jest.mock('../../network/NetworkService', () => ({
  networkService: {
    getCurrentState: jest.fn(),
  },
}));

// Mock global error handling
const mockErrorUtils = {
  getGlobalHandler: jest.fn(),
  setGlobalHandler: jest.fn(),
};
global.ErrorUtils = mockErrorUtils;

describe('ErrorTrackingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    errorTrackingService.reset();

    // Mock default return values
    jest.mocked(appLifecycleService.getCurrentSession).mockReturnValue({
      sessionId: 'test-session',
      startTime: Date.now(),
      appStateChanges: 0,
      backgroundDuration: 0,
    });
    
    jest.mocked(appLifecycleService.getCurrentAppState).mockReturnValue('active');
    
    jest.mocked(networkService.getCurrentState).mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
      timestamp: Date.now(),
    });
  });

  afterEach(() => {
    errorTrackingService.reset();
  });

  describe('startTracking', () => {
    it('should start tracking and emit tracking start event', () => {
      errorTrackingService.startTracking();

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.TRACKING_START,
        expect.objectContaining({
          timestamp: expect.any(Number),
          errorId: expect.any(String),
          message: 'Error tracking service started',
        })
      );

      expect(errorTrackingService.isTracking()).toBe(true);
    });

    it('should set up global error handler', () => {
      errorTrackingService.startTracking();

      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should not start tracking twice', () => {
      errorTrackingService.startTracking();
      jest.clearAllMocks();

      errorTrackingService.startTracking();

      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking and emit tracking stop event', () => {
      errorTrackingService.startTracking();
      jest.clearAllMocks();

      errorTrackingService.stopTracking();

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.TRACKING_STOP,
        expect.objectContaining({
          timestamp: expect.any(Number),
          errorId: expect.any(String),
          message: 'Error tracking service stopped',
        })
      );

      expect(errorTrackingService.isTracking()).toBe(false);
    });

    it('should clean up error handlers', () => {
      errorTrackingService.startTracking();
      
      errorTrackingService.stopTracking();

      expect(mockErrorUtils.setGlobalHandler).toHaveBeenCalledWith(null);
    });

    it('should handle stop when not tracking', () => {
      errorTrackingService.stopTracking();

      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('recordUserAction', () => {
    it('should record user actions when tracking', () => {
      errorTrackingService.startTracking();

      errorTrackingService.recordUserAction('button_clicked');
      errorTrackingService.recordUserAction('screen_navigated');

      const actions = errorTrackingService.getUserActionHistory();
      expect(actions).toHaveLength(2);
      expect(actions[0]).toContain('screen_navigated');
      expect(actions[1]).toContain('button_clicked');
    });

    it('should limit user action history length', () => {
      errorTrackingService.startTracking();

      // Record more than max actions
      for (let i = 0; i < 15; i++) {
        errorTrackingService.recordUserAction(`action_${i}`);
      }

      const actions = errorTrackingService.getUserActionHistory();
      expect(actions.length).toBeLessThanOrEqual(10);
    });

    it('should not record actions when not tracking', () => {
      errorTrackingService.recordUserAction('button_clicked');

      const actions = errorTrackingService.getUserActionHistory();
      expect(actions).toHaveLength(0);
    });
  });

  describe('trackError', () => {
    it('should track error with context', () => {
      errorTrackingService.startTracking();
      const testError = new Error('Test error');

      errorTrackingService.trackError(testError, 'REACT_NATIVE');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.REACT_NATIVE,
        expect.objectContaining({
          timestamp: expect.any(Number),
          errorId: expect.any(String),
          errorType: 'REACT_NATIVE',
          message: 'Test error',
          severity: 'medium',
          sessionId: 'test-session',
          appState: 'active',
          networkState: expect.objectContaining({
            isOnline: true,
            connectionType: 'wifi',
          }),
          userActions: expect.any(Array),
        })
      );
    });

    it('should emit general error event for non-unhandled errors', () => {
      errorTrackingService.startTracking();
      const testError = new Error('Test error');

      errorTrackingService.trackError(testError, 'REACT_NATIVE');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.UNHANDLED,
        expect.objectContaining({
          originalEventType: 'REACT_NATIVE',
        })
      );
    });

    it('should not track errors when not tracking', () => {
      const testError = new Error('Test error');

      errorTrackingService.trackError(testError, 'REACT_NATIVE');

      expect(mobileHooks.emit).not.toHaveBeenCalled();
    });
  });

  describe('trackUserFacingError', () => {
    it('should track user-facing error with custom message', () => {
      errorTrackingService.startTracking();

      errorTrackingService.trackUserFacingError(
        'Unable to save your data',
        new Error('Database error'),
        { severity: 'high' }
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.USER_FACING,
        expect.objectContaining({
          message: 'Unable to save your data',
          severity: 'high',
          errorType: 'USER_FACING',
        })
      );
    });

    it('should handle user-facing error without original error', () => {
      errorTrackingService.startTracking();

      errorTrackingService.trackUserFacingError('Network connection failed');

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.USER_FACING,
        expect.objectContaining({
          message: 'Network connection failed',
          severity: 'medium',
        })
      );
    });
  });

  describe('trackErrorRecovery', () => {
    it('should track error recovery attempts', () => {
      errorTrackingService.startTracking();
      const originalError = new Error('Original error');

      errorTrackingService.trackErrorRecovery(
        originalError,
        'retry_operation',
        true,
        { severity: 'low' }
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.RECOVERED,
        expect.objectContaining({
          recoveryAttempted: true,
          additionalData: expect.objectContaining({
            recoveryAction: 'retry_operation',
            recoverySuccess: true,
          }),
        })
      );
    });
  });

  describe('global error handling', () => {
    it('should handle global errors', () => {
      errorTrackingService.startTracking();
      const globalHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Global error');

      globalHandler(testError, false);

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.UNHANDLED,
        expect.objectContaining({
          message: 'Global error',
          severity: 'high',
          additionalData: expect.objectContaining({
            isFatal: false,
            handlerType: 'global',
          }),
        })
      );
    });

    it('should handle fatal errors with critical severity', () => {
      errorTrackingService.startTracking();
      const globalHandler = mockErrorUtils.setGlobalHandler.mock.calls[0][0];
      const testError = new Error('Fatal error');

      globalHandler(testError, true);

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.UNHANDLED,
        expect.objectContaining({
          severity: 'critical',
          additionalData: expect.objectContaining({
            isFatal: true,
          }),
        })
      );
    });
  });

  describe('context collection', () => {
    it('should collect app lifecycle context', () => {
      errorTrackingService.startTracking();
      const testError = new Error('Context test');

      errorTrackingService.trackError(testError, 'REACT_NATIVE');

      const emittedCall = jest.mocked(mobileHooks.emit).mock.calls[1]; // Skip tracking start call
      const errorData = emittedCall[1];

      expect(errorData).toEqual(expect.objectContaining({
        sessionId: 'test-session',
        appState: 'active',
        additionalData: expect.objectContaining({
          sessionDuration: expect.any(Number),
          appStateChanges: 0,
        }),
      }));
    });

    it('should collect network context', () => {
      errorTrackingService.startTracking();
      const testError = new Error('Network context test');

      errorTrackingService.trackError(testError, 'NETWORK_TIMEOUT');

      const emittedCall = jest.mocked(mobileHooks.emit).mock.calls[1]; // Skip tracking start call
      const errorData = emittedCall[1];

      expect(errorData.networkState).toEqual({
        isOnline: true,
        connectionType: 'wifi',
        isInternetReachable: true,
      });
    });

    it('should handle context collection errors gracefully', () => {
      jest.mocked(appLifecycleService.getCurrentSession).mockImplementation(() => {
        throw new Error('Context error');
      });

      errorTrackingService.startTracking();
      const testError = new Error('Test error');

      expect(() => {
        errorTrackingService.trackError(testError, 'REACT_NATIVE');
      }).not.toThrow();

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.REACT_NATIVE,
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });
  });
});