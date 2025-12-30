import { useEffect, useCallback } from 'react';
import { useNetworkState } from './useNetworkState';
import { operationQueue } from '../services/OperationQueue';
import { executeOperation, isRetriableError } from '../services/QueueExecutor';
import { syncService } from '../services/sync/SyncService';

/**
 * Hook to manage sync queue and trigger processing when online
 * Automatically processes queue when network connection is restored
 * Also performs bidirectional sync with the server (Phase 5)
 */
export function useSyncQueue() {
  const { isOnline } = useNetworkState();

  // Process queue and perform bidirectional sync when network comes back online
  useEffect(() => {
    if (isOnline) {
      performFullSync();
    }
  }, [isOnline]);

  const processQueue = useCallback(async () => {
    try {
      await operationQueue.processQueue(executeOperation);
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  }, []);

  const performFullSync = useCallback(async () => {
    try {
      console.log('Starting full sync (queue + bidirectional)...');
      
      // First process any queued operations
      await operationQueue.processQueue(executeOperation);
      
      // Then perform bidirectional sync
      const syncResult = await syncService.performSync();
      console.log('Full sync completed:', syncResult);
      
    } catch (error) {
      console.error('Failed to perform full sync:', error);
    }
  }, []);

  return {
    processQueue,
    performFullSync,
    isRetriableError,
  };
}
