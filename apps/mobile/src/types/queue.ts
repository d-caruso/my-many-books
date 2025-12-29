export type OperationType = 'CREATE' | 'UPDATE' | 'DELETE';
export type OperationStatus = 'pending' | 'retrying' | 'failed';
export type ResourceType = 'book' | 'user' | 'settings';

export interface QueuedOperation {
  id: string;              // UUID
  type: OperationType;
  resource: ResourceType;
  payload: any;            // Operation data
  timestamp: number;       // When queued
  retryCount: number;      // Attempts so far
  maxRetries: number;      // Max attempts (default: 3)
  status: OperationStatus;
}
