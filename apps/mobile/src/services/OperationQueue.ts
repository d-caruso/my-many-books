import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedOperation, OperationType, ResourceType } from '../types/queue';

const QUEUE_STORAGE_KEY = '@operation_queue';

export class OperationQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing: boolean = false;

  /**
   * Initialize queue from AsyncStorage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to initialize queue:', error);
      this.queue = [];
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(
    type: OperationType,
    resource: ResourceType,
    payload: any,
    maxRetries: number = 3
  ): Promise<string> {
    const operation: QueuedOperation = {
      id: '', // Will be set in Task 2.1.3 with uuid
      type,
      resource,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      status: 'pending',
    };

    this.queue.push(operation);
    await this.persist();
    return operation.id;
  }

  /**
   * Remove operation from queue
   */
  async dequeue(operationId: string): Promise<void> {
    this.queue = this.queue.filter(op => op.id !== operationId);
    await this.persist();
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status === 'pending' || op.status === 'retrying');
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Clear all operations
   */
  async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }
}

// Singleton instance
export const operationQueue = new OperationQueue();
