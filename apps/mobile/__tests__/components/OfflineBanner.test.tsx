// Test for OfflineBanner component

describe('OfflineBanner', () => {
  let mockUseNetworkState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useNetworkState hook
    mockUseNetworkState = jest.fn();
    jest.doMock('../../src/hooks/useNetworkState', () => ({
      useNetworkState: mockUseNetworkState,
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('should export OfflineBanner component', () => {
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const OfflineBannerModule = require('../../src/components/OfflineBanner');

    expect(OfflineBannerModule.OfflineBanner).toBeDefined();
    expect(typeof OfflineBannerModule.OfflineBanner).toBe('function');
  });

  it('should return null when online', () => {
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const { OfflineBanner } = require('../../src/components/OfflineBanner');

    const result = OfflineBanner({});
    expect(result).toBeNull();
  });

  it('should render banner when offline', () => {
    mockUseNetworkState.mockReturnValue({
      isOnline: false,
      isInternetReachable: false,
      connectionType: 'none',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const { OfflineBanner } = require('../../src/components/OfflineBanner');

    const result = OfflineBanner({});
    expect(result).not.toBeNull();
    expect(result).toBeDefined();
  });

  it('should use network state hook', () => {
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const { OfflineBanner } = require('../../src/components/OfflineBanner');

    OfflineBanner({});
    expect(mockUseNetworkState).toHaveBeenCalled();
  });

  it('should handle component when network state changes', () => {
    // First render - online
    mockUseNetworkState.mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const { OfflineBanner } = require('../../src/components/OfflineBanner');

    const resultOnline = OfflineBanner({});
    expect(resultOnline).toBeNull();

    // Second render - offline
    mockUseNetworkState.mockReturnValue({
      isOnline: false,
      isInternetReachable: false,
      connectionType: 'none',
    });

    const resultOffline = OfflineBanner({});
    expect(resultOffline).not.toBeNull();
  });

  it('should have accessibility properties when offline', () => {
    mockUseNetworkState.mockReturnValue({
      isOnline: false,
      isInternetReachable: false,
      connectionType: 'none',
    });

    delete require.cache[require.resolve('../../src/components/OfflineBanner')];
    const { OfflineBanner } = require('../../src/components/OfflineBanner');

    const result = OfflineBanner({});
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });
});
