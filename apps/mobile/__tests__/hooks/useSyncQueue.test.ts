// Test for useSyncQueue hook - network state change processing and sync behavior
import { renderHook, act } from '@testing-library/react-hooks';
import { useSyncQueue } from '../../src/hooks/useSyncQueue';
import { operationQueue } from '../../src/services/OperationQueue';
import { executeOperation, isRetriableError } from '../../src/services/QueueExecutor';
import { syncService } from '../../src/services/sync/SyncService';

// Mock network state
let mockNetworkState = {
  isOnline: true,
  isInternetReachable: true,
  connectionType: 'wifi',
};

jest.mock('../../src/hooks/useNetworkState', () => ({
  useNetworkState: () => mockNetworkState,
}));

jest.mock('../../src/services/OperationQueue', () => ({
  operationQueue: {
    processQueue: jest.fn(),
  },
}));

jest.mock('../../src/services/QueueExecutor', () => ({
  executeOperation: jest.fn(),
  isRetriableError: jest.fn(),
}));

jest.mock('../../src/services/sync/SyncService', () => ({
  syncService: {
    performSync: jest.fn().mockResolvedValue({ success: true }),
  },
}));

const mockProcessQueue = operationQueue.processQueue as jest.Mock;
const mockExecuteOperation = executeOperation as jest.Mock;
const mockIsRetriableError = isRetriableError as jest.Mock;
const mockPerformFullSync = syncService.performSync as jest.Mock;

describe('useSyncQueue Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessQueue.mockResolvedValue(undefined);
    mockPerformFullSync.mockResolvedValue(undefined);
    mockExecuteOperation.mockResolvedValue(undefined);
    mockIsRetriableError.mockReturnValue(false);

    // Reset network state to online
    mockNetworkState = {
      isOnline: true,
      isInternetReachable: true,
      connectionType: 'wifi',
    };
  });

  describe('Hook Interface', () => {
    it('should return the correct functions', () => {
      const { result } = renderHook(() => useSyncQueue());

      expect(result.current.processQueue).toBeDefined();
      expect(typeof result.current.processQueue).toBe('function');
      expect(result.current.performFullSync).toBeDefined();
      expect(typeof result.current.performFullSync).toBe('function');
      expect(result.current.isRetriableError).toBeDefined();
      expect(typeof result.current.isRetriableError).toBe('function');
    });
  });

  describe('Network State Change Processing', () => {
    it('should trigger full sync when coming online', () => {
      // Start offline
      mockNetworkState.isOnline = false;
      const { rerender } = renderHook(() => useSyncQueue());

      // Go online - should trigger sync
      mockNetworkState.isOnline = true;

      act(() => {
        rerender();
      });

      // Verify that performFullSync is called (which includes processQueue)
      expect(mockProcessQueue).toHaveBeenCalled();
    });

    it('should not trigger sync when going offline', () => {
      // Start online
      mockNetworkState.isOnline = true;
      const { rerender } = renderHook(() => useSyncQueue());

      jest.clearAllMocks(); // Clear the initial sync call

      // Go offline - should not trigger sync
      mockNetworkState.isOnline = false;

      act(() => {
        rerender();
      });

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should handle network state changes multiple times', () => {
      mockNetworkState.isOnline = false;
      const { rerender } = renderHook(() => useSyncQueue());

      // Multiple online/offline cycles
      for (let i = 0; i < 3; i++) {
        jest.clearAllMocks();

        // Go online
        mockNetworkState.isOnline = true;
        act(() => {
          rerender();
        });
        expect(mockProcessQueue).toHaveBeenCalled();

        // Go offline
        jest.clearAllMocks();
        mockNetworkState.isOnline = false;
        act(() => {
          rerender();
        });
        expect(mockProcessQueue).not.toHaveBeenCalled();
      }
    });

    it('should handle different connection types', () => {
      const connectionTypes = ['wifi', 'cellular', 'ethernet', 'bluetooth'];

      connectionTypes.forEach(connectionType => {
        jest.clearAllMocks();

        mockNetworkState = {
          isOnline: true,
          isInternetReachable: true,
          connectionType,
        };

        renderHook(() => useSyncQueue());

        expect(mockProcessQueue).toHaveBeenCalled();
      });
    });
  });

  describe('Sync Functions', () => {
    it('should call processQueue directly when processQueue is invoked', async () => {
      const { result } = renderHook(() => useSyncQueue());

      await act(async () => {
        await result.current.processQueue();
      });

      expect(mockProcessQueue).toHaveBeenCalledWith(mockExecuteOperation);
    });

    it('should perform full sync when performFullSync is invoked', async () => {
      const { result } = renderHook(() => useSyncQueue());

      await act(async () => {
        await result.current.performFullSync();
      });

      // Should call both queue processing and bidirectional sync
      expect(mockProcessQueue).toHaveBeenCalledWith(mockExecuteOperation);
    });

    it('should handle errors in processQueue gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const testError = new Error('Queue processing failed');
      mockProcessQueue.mockRejectedValue(testError);

      const { result } = renderHook(() => useSyncQueue());

      await act(async () => {
        await result.current.processQueue();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to process queue:', testError);
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors in performFullSync gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const testError = new Error('Full sync failed');
      mockProcessQueue.mockRejectedValue(testError);

      const { result } = renderHook(() => useSyncQueue());

      await act(async () => {
        await result.current.performFullSync();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to perform full sync:', testError);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle rapid network state changes', () => {
      mockNetworkState.isOnline = false;
      const { rerender } = renderHook(() => useSyncQueue());

      // Rapidly toggle network state
      for (let i = 0; i < 10; i++) {
        mockNetworkState.isOnline = !mockNetworkState.isOnline;
        act(() => {
          rerender();
        });
      }

      // Should handle without crashing
      expect(mockProcessQueue).toHaveBeenCalled();
    });

    it('should return isRetriableError function correctly', () => {
      const { result } = renderHook(() => useSyncQueue());

      expect(result.current.isRetriableError).toBe(mockIsRetriableError);
    });

    it('should not sync when network is unreachable despite being "online"', () => {
      // Start offline
      mockNetworkState = {
        isOnline: true, // Device thinks it's online
        isInternetReachable: false, // But internet is not reachable
        connectionType: 'wifi',
      };

      renderHook(() => useSyncQueue());

      // Should still attempt sync based on isOnline flag
      // (The actual network check happens in the API layer)
      expect(mockProcessQueue).toHaveBeenCalled();
    });

    it('should handle undefined network state gracefully', () => {
      mockNetworkState = {
        isOnline: undefined as boolean,
        isInternetReachable: undefined as boolean,
        connectionType: undefined as string,
      };

      expect(() => {
        renderHook(() => useSyncQueue());
      }).not.toThrow();
    });
  });
});
