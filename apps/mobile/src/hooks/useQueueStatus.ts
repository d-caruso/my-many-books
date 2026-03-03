import { useState, useEffect, useCallback } from 'react';
import { operationQueue } from '../services/OperationQueue';
import type { QueuedOperation } from '../types/queue';

/**
 * Hook to track queue status in real-time
 */
export function useQueueStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshQueue = useCallback(async () => {
    await operationQueue.initialize();
    const processable = operationQueue.getProcessableOperations();
    const allOps = operationQueue['queue']; // Access private queue for full list
    
    setPendingCount(processable.length); // Use processable count instead of just pending
    setOperations(allOps);
    
    // Check if any operations are currently being processed/syncing
    const hasProcessingOps = allOps.some(op => op.status === 'retrying');
    setIsProcessing(hasProcessingOps);
  }, []);

  useEffect(() => {
    // Refresh every 2 seconds to catch changes
    const interval = setInterval(() => {
      void refreshQueue();
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshQueue]);

  return {
    pendingCount,
    operations,
    isProcessing,
    refreshQueue,
  };
}
