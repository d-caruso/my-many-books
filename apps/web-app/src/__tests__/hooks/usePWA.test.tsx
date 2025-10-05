import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { usePWA } from '../../hooks/usePWA';

// Mock service worker registration
const mockRegistration = {
  waiting: null,
  update: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    ready: Promise.resolve(mockRegistration),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// Mock window.addEventListener for beforeinstallprompt
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

// Mock window.location.reload
Object.defineProperty(window.location, 'reload', {
  writable: true,
  value: vi.fn(),
});

// Mock console methods
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('usePWA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistration.waiting = null;
    
    // Reset online/offline status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterAll(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test('initializes with default values', () => {
    const { result } = renderHook(() => usePWA());

    expect(result.current.isOffline).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isInstallable).toBe(false);
    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.registration).toBe(null);
    expect(typeof result.current.installApp).toBe('function');
    expect(typeof result.current.updateApp).toBe('function');
    expect(typeof result.current.dismissUpdate).toBe('function');
  });

  test('detects offline status', () => {
    // Set navigator.onLine to false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isOffline).toBe(true);
  });

  test('detects installed PWA status', () => {
    // Mock display mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => usePWA());

    expect(result.current.isInstalled).toBe(true);
  });

  test('handles beforeinstallprompt event', () => {
    const { result } = renderHook(() => usePWA());

    // Find the beforeinstallprompt event listener
    const beforeInstallPromptCall = mockAddEventListener.mock.calls.find(
      call => call[0] === 'beforeinstallprompt'
    );
    expect(beforeInstallPromptCall).toBeTruthy();

    // Simulate the beforeinstallprompt event
    const mockEvent = {
      preventDefault: vi.fn(),
    };

    act(() => {
      beforeInstallPromptCall[1](mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(result.current.isInstallable).toBe(true);
  });


  test('installApp function exists and can be called', async () => {
    const { result } = renderHook(() => usePWA());

    // Call installApp without setup - should handle gracefully
    await act(async () => {
      await result.current.installApp();
    });

    expect(typeof result.current.installApp).toBe('function');
  });


  test('updateApp function exists and can be called', async () => {
    const { result } = renderHook(() => usePWA());

    await act(async () => {
      await result.current.updateApp();
    });

    expect(typeof result.current.updateApp).toBe('function');
  });

  test('dismissUpdate function works', () => {
    const { result } = renderHook(() => usePWA());

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.updateAvailable).toBe(false);
  });

  test('handles online/offline events', () => {
    const { result } = renderHook(() => usePWA());

    // Find the online/offline event listeners
    const onlineCall = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    );
    const offlineCall = mockAddEventListener.mock.calls.find(
      call => call[0] === 'offline'
    );

    expect(onlineCall).toBeTruthy();
    expect(offlineCall).toBeTruthy();

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    act(() => {
      offlineCall[1]();
    });

    expect(result.current.isOffline).toBe(true);

    // Simulate going online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    act(() => {
      onlineCall[1]();
    });

    expect(result.current.isOffline).toBe(false);
  });

  test('basic hook functionality works', () => {
    const { result } = renderHook(() => usePWA());

    // Test that all expected properties exist
    expect(result.current).toHaveProperty('isOffline');
    expect(result.current).toHaveProperty('isInstallable');
    expect(result.current).toHaveProperty('isInstalled');
    expect(result.current).toHaveProperty('updateAvailable');
    expect(result.current).toHaveProperty('registration');
    expect(result.current).toHaveProperty('installApp');
    expect(result.current).toHaveProperty('updateApp');
    expect(result.current).toHaveProperty('dismissUpdate');
  });

  test('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() => usePWA());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
  });
});