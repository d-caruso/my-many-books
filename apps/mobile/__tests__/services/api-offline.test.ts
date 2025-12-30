// Test for API offline error handling
import NetInfo from '@react-native-community/netinfo';
import * as apiModule from '@/services/api';

// Mock NetInfo is already set up globally in setupTests.ts
// We can spy on it here to control return values

describe('API Offline Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Module Exports', () => {
    it('should export apiUtils with utility functions', () => {
      expect(apiModule.apiUtils).toBeDefined();
      expect(typeof apiModule.apiUtils.getAuthHeaders).toBe('function');
    });

    it('should export bookAPI', () => {
      expect(apiModule.bookAPI).toBeDefined();
      expect(typeof apiModule.bookAPI.getBooks).toBe('function');
      expect(typeof apiModule.bookAPI.createBook).toBe('function');
    });

    it('should export userAPI', () => {
      expect(apiModule.userAPI).toBeDefined();
      expect(typeof apiModule.userAPI.getCurrentUser).toBe('function');
      expect(typeof apiModule.userAPI.login).toBe('function');
    });
  });

  describe('Network State Utilities', () => {
    it('should check if device is online', async () => {
      // NetInfo.fetch is mocked globally to return online state
      const isOnline = await apiModule.apiUtils.isOnline();

      expect(NetInfo.fetch).toHaveBeenCalled();
      expect(typeof isOnline).toBe('boolean');
    });

    it('should handle null network state as offline', async () => {
      jest.spyOn(NetInfo, 'fetch').mockResolvedValueOnce({
        type: 'none',
        isConnected: null,
        isInternetReachable: null,
        details: null,
      } as any);

      const isOnline = await apiModule.apiUtils.isOnline();

      expect(isOnline).toBe(false);
    });

    it('should return false when network is disconnected', async () => {
      jest.spyOn(NetInfo, 'fetch').mockResolvedValueOnce({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as any);

      const isOnline = await apiModule.apiUtils.isOnline();

      expect(isOnline).toBe(false);
    });
  });

  describe('Error Utilities', () => {
    it('should identify offline errors by message', () => {
      const offlineMessage = "You're offline. Check your connection and try again.";
      const offlineError = new Error(offlineMessage);
      const otherError = new Error('Some other error');

      expect(apiModule.apiUtils.isOfflineError(offlineError)).toBe(true);
      expect(apiModule.apiUtils.isOfflineError(otherError)).toBe(false);
    });

    it('should get auth headers', () => {
      const headers = apiModule.apiUtils.getAuthHeaders();

      expect(headers).toBeDefined();
      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Offline Error Handling', () => {
    it('should throw offline error when device is offline', async () => {
      jest.spyOn(NetInfo, 'fetch').mockResolvedValueOnce({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as any);

      const mockError = new Error('Original error');

      await expect(apiModule.apiUtils.handleOfflineError(mockError)).rejects.toThrow(
        "You're offline. Check your connection and try again."
      );
    });

    it('should rethrow original error when device is online', async () => {
      jest.spyOn(NetInfo, 'fetch').mockResolvedValueOnce({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: { isConnectionExpensive: false, ssid: 'test', strength: 100 },
      } as any);

      const mockError = new Error('Original error');

      await expect(apiModule.apiUtils.handleOfflineError(mockError)).rejects.toThrow('Original error');
    });
  });
});
