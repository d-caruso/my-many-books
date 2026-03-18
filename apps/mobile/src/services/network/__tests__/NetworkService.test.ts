import NetInfo from '@react-native-community/netinfo';
import { NetworkService } from '../NetworkService';
import { mobileHooks, MOBILE_EVENTS } from '../../hooks/mobileHooks';
import { mobileEventUploadService } from '../../hooks/MobileEventUploadService';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Mock mobile hooks
jest.mock('../../hooks/mobileHooks', () => ({
  mobileHooks: {
    emit: jest.fn(),
  },
  MOBILE_EVENTS: {
    NETWORK: {
      ONLINE: 'NETWORK.ONLINE',
      OFFLINE: 'NETWORK.OFFLINE',
      TYPE_CHANGED: 'NETWORK.TYPE_CHANGED',
      QUALITY_CHANGED: 'NETWORK.QUALITY_CHANGED',
      REACHABLE: 'NETWORK.REACHABLE',
      UNREACHABLE: 'NETWORK.UNREACHABLE',
      RESTORED: 'NETWORK.RESTORED',
      MONITORING_START: 'NETWORK.MONITORING_START',
      MONITORING_STOP: 'NETWORK.MONITORING_STOP',
    },
    ERROR: {
      NETWORK_TIMEOUT: 'ERROR.NETWORK_TIMEOUT',
    },
  },
}));

jest.mock('../../hooks/MobileEventUploadService', () => ({
  mobileEventUploadService: {
    uploadStoredEvents: jest.fn().mockResolvedValue({
      totalLoaded: 0,
      uploaded: 0,
      remaining: 0,
    }),
  },
}));

describe('NetworkService', () => {
  let networkService: NetworkService;
  let mockAddEventListener: jest.Mock;
  let mockFetch: jest.Mock;
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh service instance with no debouncing for tests
    networkService = new NetworkService(0);
    
    mockUnsubscribe = jest.fn();
    mockAddEventListener = jest.mocked(NetInfo.addEventListener);
    mockFetch = jest.mocked(NetInfo.fetch);
    
    mockAddEventListener.mockReturnValue(mockUnsubscribe);
    mockFetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {}
    });
  });

  afterEach(() => {
    // Clean up service state
    networkService.reset();
  });

  describe('startMonitoring', () => {
    it('should start monitoring and emit initial state', async () => {
      await networkService.startMonitoring();

      expect(mockFetch).toHaveBeenCalled();
      expect(mockAddEventListener).toHaveBeenCalled();
      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.MONITORING_START,
        expect.objectContaining({
          initialState: expect.objectContaining({
            isOnline: true,
            isInternetReachable: true,
            connectionType: 'wifi',
            timestamp: expect.any(Number),
          }),
          timestamp: expect.any(Number),
        })
      );
    });

    it('should not start monitoring twice', async () => {
      await networkService.startMonitoring();
      jest.clearAllMocks();

      await networkService.startMonitoring();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockAddEventListener).not.toHaveBeenCalled();
    });

    it('should emit error event when NetInfo.fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await networkService.startMonitoring();

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.ERROR.NETWORK_TIMEOUT,
        expect.objectContaining({
          error: 'Failed to initialize network monitoring: Network error',
          timestamp: expect.any(Number),
          context: { service: 'NetworkService', method: 'startMonitoring' }
        })
      );
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and emit stop event', async () => {
      await networkService.startMonitoring();
      jest.clearAllMocks();

      networkService.stopMonitoring();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.MONITORING_STOP,
        expect.objectContaining({
          lastState: expect.objectContaining({
            isOnline: true,
            isInternetReachable: true,
            connectionType: 'wifi',
          }),
          timestamp: expect.any(Number),
        })
      );
      expect(networkService.isMonitoring()).toBe(false);
    });

    it('should handle stop when not monitoring', () => {
      networkService.stopMonitoring();

      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('network state change events', () => {
    let networkStateListener: (state: { type: string; isConnected: boolean; isInternetReachable: boolean; details?: unknown }) => void;

    beforeEach(async () => {
      await networkService.startMonitoring();
      networkStateListener = mockAddEventListener.mock.calls[0][0];
      jest.clearAllMocks();
    });

    it('should emit ONLINE event when going from offline to online', () => {
      // First go offline
      networkStateListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      jest.clearAllMocks();

      // Then go back online
      networkStateListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.ONLINE,
        expect.objectContaining({
          isOnline: true,
          isInternetReachable: true,
          connectionType: 'wifi',
          timestamp: expect.any(Number),
          previousState: expect.any(Object),
        })
      );
    });

    it('should emit OFFLINE event when going from online to offline', () => {
      networkStateListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.OFFLINE,
        expect.objectContaining({
          isOnline: false,
          isInternetReachable: false,
          connectionType: 'none',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should emit TYPE_CHANGED event when connection type changes', () => {
      // First change to establish previous state
      networkStateListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {}
      });

      jest.clearAllMocks();

      // Second change to trigger TYPE_CHANGED
      networkStateListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.TYPE_CHANGED,
        expect.objectContaining({
          isOnline: true,
          connectionType: 'wifi',
          changedFrom: 'cellular',
          changedTo: 'wifi',
        })
      );
    });

    it('should emit RESTORED event when coming back online after being offline', () => {
      // First go offline
      networkStateListener({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
        details: {}
      });

      jest.clearAllMocks();

      // Then come back online
      networkStateListener({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
        details: {}
      });

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.ONLINE,
        expect.any(Object)
      );

      expect(mobileHooks.emit).toHaveBeenCalledWith(
        MOBILE_EVENTS.NETWORK.RESTORED,
        expect.objectContaining({
          isOnline: true,
          connectionType: 'wifi',
          restoredFrom: 'none',
        })
      );
      expect(mobileEventUploadService.uploadStoredEvents).toHaveBeenCalledWith({
        trigger: 'network_restored',
      });
    });
  });

  describe('getCurrentState', () => {
    it('should return current network state after monitoring starts', async () => {
      await networkService.startMonitoring();

      const state = networkService.getCurrentState();

      expect(state).toEqual(
        expect.objectContaining({
          isOnline: true,
          isInternetReachable: true,
          connectionType: 'wifi',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should return null when not monitoring', () => {
      const state = networkService.getCurrentState();
      expect(state).toBeNull();
    });
  });
});
