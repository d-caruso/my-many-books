import React, { useEffect } from 'react';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { operationQueue } from '../services/OperationQueue';

/**
 * Provider component that initializes sync functionality
 * This ensures the sync hook is active throughout the app lifecycle
 */
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize the persisted queue on app start
  useEffect(() => {
    const initQueue = async () => {
      try {
        await operationQueue.initialize();
        console.log(`Operation queue initialized with ${operationQueue.size()} operations`);
      } catch (error) {
        console.error('Failed to initialize operation queue:', error);
      }
    };

    initQueue();
  }, []);

  // Initialize sync queue hook - this will automatically handle network state changes
  useSyncQueue();
  
  // Return children unchanged - this is purely for side effects
  return <>{children}</>;
};