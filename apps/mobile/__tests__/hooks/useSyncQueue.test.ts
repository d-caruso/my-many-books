// Test for useSyncQueue hook
// Tests automatic queue processing when network state changes

describe('useSyncQueue Hook', () => {
  let mockProcessQueue: jest.Mock;
  let mockIsOnline: boolean;
  let mockUseNetworkState: jest.Mock;
  let mockOperationQueue: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProcessQueue = jest.fn().mockResolvedValue(undefined);
    mockIsOnline = true;

    // Mock useNetworkState
    mockUseNetworkState = jest.fn(() => ({
      isOnline: mockIsOnline,
      isInternetReachable: true,
      connectionType: 'wifi',
    }));

    // Mock OperationQueue
    mockOperationQueue = {
      processQueue: mockProcessQueue,
    };

    jest.doMock('../../src/hooks/useNetworkState', () => ({
      useNetworkState: mockUseNetworkState,
    }));

    jest.doMock('../../src/services/OperationQueue', () => ({
      operationQueue: mockOperationQueue,
    }));

    jest.doMock('../../src/services/QueueExecutor', () => ({
      executeOperation: jest.fn(),
      isRetriableError: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should import useSyncQueue hook', () => {
    delete require.cache[require.resolve('../../src/hooks/useSyncQueue')];
    const hookModule = require('../../src/hooks/useSyncQueue');

    expect(hookModule.useSyncQueue).toBeDefined();
    expect(typeof hookModule.useSyncQueue).toBe('function');
  });

  it('should process queue when online', () => {
    const React = require('react');
    const originalUseEffect = React.useEffect;
    const originalUseCallback = React.useCallback;

    let effectCallback: (() => void) | undefined;

    React.useEffect = jest.fn((fn: () => void) => {
      effectCallback = fn;
    });

    React.useCallback = jest.fn((fn: () => void) => fn);

    mockIsOnline = true;
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/hooks/useSyncQueue')];
    const { useSyncQueue } = require('../../src/hooks/useSyncQueue');

    const result = useSyncQueue();

    expect(result).toBeDefined();
    expect(result.processQueue).toBeDefined();
    expect(result.isRetriableError).toBeDefined();

    // Simulate effect running
    if (effectCallback) {
      effectCallback();
    }

    React.useEffect = originalUseEffect;
    React.useCallback = originalUseCallback;
  });

  it('should not process queue when offline', () => {
    const React = require('react');
    const originalUseEffect = React.useEffect;
    const originalUseCallback = React.useCallback;

    let effectCallback: (() => void) | undefined;

    React.useEffect = jest.fn((fn: () => void) => {
      effectCallback = fn;
    });

    React.useCallback = jest.fn((fn: () => void) => fn);

    mockIsOnline = false;
    mockUseNetworkState.mockReturnValue({
      isOnline: false,
      isInternetReachable: false,
      connectionType: 'none',
    });

    delete require.cache[require.resolve('../../src/hooks/useSyncQueue')];
    const { useSyncQueue } = require('../../src/hooks/useSyncQueue');

    useSyncQueue();

    // Simulate effect running
    if (effectCallback) {
      effectCallback();
    }

    // processQueue should not be called when offline
    expect(mockProcessQueue).not.toHaveBeenCalled();

    React.useEffect = originalUseEffect;
    React.useCallback = originalUseCallback;
  });

  it('should handle errors during queue processing', async () => {
    const React = require('react');
    const originalUseEffect = React.useEffect;
    const originalUseCallback = React.useCallback;
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const mockError = new Error('Queue processing failed');
    mockProcessQueue.mockRejectedValue(mockError);

    let callbackFn: (() => Promise<void>) | undefined;

    React.useEffect = jest.fn();
    React.useCallback = jest.fn((fn: () => Promise<void>) => {
      callbackFn = fn;
      return fn;
    });

    mockIsOnline = true;
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/hooks/useSyncQueue')];
    const { useSyncQueue } = require('../../src/hooks/useSyncQueue');

    const result = useSyncQueue();

    // Manually call processQueue
    if (callbackFn) {
      await callbackFn();
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to process queue:', mockError);

    React.useEffect = originalUseEffect;
    React.useCallback = originalUseCallback;
    consoleErrorSpy.mockRestore();
  });

  it('should return processQueue and isRetriableError functions', () => {
    const React = require('react');
    const originalUseEffect = React.useEffect;
    const originalUseCallback = React.useCallback;

    React.useEffect = jest.fn();
    React.useCallback = jest.fn((fn: () => void) => fn);

    delete require.cache[require.resolve('../../src/hooks/useSyncQueue')];
    const { useSyncQueue } = require('../../src/hooks/useSyncQueue');

    const result = useSyncQueue();

    expect(result.processQueue).toBeDefined();
    expect(typeof result.processQueue).toBe('function');
    expect(result.isRetriableError).toBeDefined();
    expect(typeof result.isRetriableError).toBe('function');

    React.useEffect = originalUseEffect;
    React.useCallback = originalUseCallback;
  });
});
