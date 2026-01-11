import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAppLifecycle } from '../useAppLifecycle';
import { appLifecycleService } from '../../services/lifecycle/AppLifecycleService';

// Mock React Native AppState
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
}));

// Mock AppLifecycleService
jest.mock('../../services/lifecycle/AppLifecycleService', () => ({
  appLifecycleService: {
    startMonitoring: jest.fn(),
    getCurrentAppState: jest.fn(),
    getCurrentSession: jest.fn(),
    isMonitoring: jest.fn(),
    reset: jest.fn(),
  },
}));

describe('useAppLifecycle', () => {
  let mockAddEventListener: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRemove = jest.fn();
    mockAddEventListener = jest.mocked(AppState.addEventListener);
    mockAddEventListener.mockReturnValue({ remove: mockRemove });

    // Mock service methods
    jest.mocked(appLifecycleService.getCurrentAppState).mockReturnValue('active');
    jest.mocked(appLifecycleService.getCurrentSession).mockReturnValue({
      sessionId: 'test-session',
      startTime: Date.now(),
      appStateChanges: 0,
      backgroundDuration: 0,
    });
    jest.mocked(appLifecycleService.isMonitoring).mockReturnValue(true);
  });

  it('should start monitoring on mount', () => {
    renderHook(() => useAppLifecycle());

    expect(appLifecycleService.startMonitoring).toHaveBeenCalled();
  });

  it('should return current app lifecycle state', () => {
    const { result } = renderHook(() => useAppLifecycle());

    expect(result.current.appState).toBe('active');
    expect(result.current.isMonitoring).toBe(true);
    expect(result.current.currentSession).toEqual(
      expect.objectContaining({
        sessionId: 'test-session',
        appStateChanges: 0,
      })
    );
  });

  it('should update state when app state changes', () => {
    const { result } = renderHook(() => useAppLifecycle());
    
    // Simulate app state change
    const appStateChangeHandler = mockAddEventListener.mock.calls[0][1];
    
    // Update mock return values
    jest.mocked(appLifecycleService.getCurrentAppState).mockReturnValue('background');
    jest.mocked(appLifecycleService.getCurrentSession).mockReturnValue({
      sessionId: 'test-session',
      startTime: Date.now(),
      appStateChanges: 1,
      backgroundDuration: 0,
    });

    act(() => {
      appStateChangeHandler('background');
    });

    expect(result.current.appState).toBe('background');
    expect(result.current.currentSession?.appStateChanges).toBe(1);
  });

  it('should clean up listeners on unmount', () => {
    const { unmount } = renderHook(() => useAppLifecycle());

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should handle session updates periodically', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useAppLifecycle());

    // Update session data
    jest.mocked(appLifecycleService.getCurrentSession).mockReturnValue({
      sessionId: 'test-session',
      startTime: Date.now(),
      appStateChanges: 5,
      backgroundDuration: 1000,
    });

    // Fast-forward timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.currentSession?.appStateChanges).toBe(5);
    expect(result.current.currentSession?.backgroundDuration).toBe(1000);

    jest.useRealTimers();
  });

  it('should handle service not monitoring', () => {
    jest.mocked(appLifecycleService.isMonitoring).mockReturnValue(false);
    jest.mocked(appLifecycleService.getCurrentSession).mockReturnValue(null);

    const { result } = renderHook(() => useAppLifecycle());

    expect(result.current.isMonitoring).toBe(false);
    expect(result.current.currentSession).toBeNull();
  });
});