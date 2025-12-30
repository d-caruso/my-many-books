import React from 'react';
import { useSyncQueue } from '../hooks/useSyncQueue';

/**
 * Provider component that initializes sync functionality
 * This ensures the sync hook is active throughout the app lifecycle
 */
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize sync queue hook - this will automatically handle network state changes
  useSyncQueue();
  
  // Return children unchanged - this is purely for side effects
  return <>{children}</>;
};