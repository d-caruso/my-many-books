import { useEffect, useCallback } from 'react';
import { useNetworkState } from './useNetworkState';
import { operationQueue } from '../services/OperationQueue';
import { executeOperation, isRetriableError } from '../services/QueueExecutor';

/**
 * Hook to manage sync queue and trigger processing when online
 * Automatically processes queue when network connection is restored
 */
export function useSyncQueue() {
  const { isOnline } = useNetworkState();

  // Process queue when network comes back online
  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline]);

  const processQueue = useCallback(async () => {
    try {
      await operationQueue.processQueue(executeOperation);
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  }, []);

  return {
    processQueue,
    isRetriableError,
  };
}
