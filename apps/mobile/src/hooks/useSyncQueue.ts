import { useEffect, useCallback } from 'react';
import { useNetworkState } from './useNetworkState';
import { operationQueue } from '../services/OperationQueue';
import { executeOperation, isRetriableError } from '../services/QueueExecutor';
import { syncService } from '../services/sync/SyncService';
import { mobileHooks, MOBILE_EVENTS } from '@/services/hooks/mobileHooks';

/**
 * Hook to manage sync queue and trigger processing when online
 * Automatically processes queue when network connection is restored
 * Also performs bidirectional sync with the server (Phase 5)
 */
export function useSyncQueue() {
  const { isOnline } = useNetworkState();

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

  const processQueue = useCallback(async () => {
    try {
      await operationQueue.processQueue(executeOperation);
    } catch (error) {
      console.error('Failed to process queue:', error);
    }
  }, []);

  const resumeSync = useCallback(async () => {
    mobileHooks.emit(MOBILE_EVENTS.SYNC.RESUME_MANUAL, {
      source: 'useSyncQueue.resumeSync',
    });
    await performFullSync();
  }, [performFullSync]);

  // Process queue and perform bidirectional sync when network comes back online
  useEffect(() => {
    if (isOnline) {
      void performFullSync();
    }
  }, [isOnline, performFullSync]);

  return {
    processQueue,
    performFullSync,
    resumeSync,
    isRetriableError,
  };
}
