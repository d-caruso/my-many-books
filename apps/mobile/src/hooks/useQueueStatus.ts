import { useState, useEffect } from 'react';
import { operationQueue } from '../services/OperationQueue';
import type { QueuedOperation } from '../types/queue';

/**
 * Hook to track queue status in real-time
 */
export function useQueueStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshQueue = async () => {
    await operationQueue.initialize();
    const processable = operationQueue.getProcessableOperations();
    const allOps = operationQueue['queue']; // Access private queue for full list
    
    setPendingCount(processable.length); // Use processable count instead of just pending
    setOperations(allOps);
    
    // Check if any operations are currently being processed/syncing
    const hasProcessingOps = allOps.some(op => op.status === 'retrying');
    setIsProcessing(hasProcessingOps);
  };

  useEffect(() => {
    refreshQueue();

    // Refresh every 2 seconds to catch changes
    const interval = setInterval(refreshQueue, 2000);

    return () => clearInterval(interval);
  }, []);

  return {
    pendingCount,
    operations,
    isProcessing,
    refreshQueue,
  };
}
