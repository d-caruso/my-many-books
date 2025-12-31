import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { QueuedOperation, OperationType, ResourceType } from '../types/queue';
import { Alert } from 'react-native';

const QUEUE_STORAGE_KEY = '@operation_queue';
const MAX_QUEUE_SIZE = 100;

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
      console.error('Failed to initialize queue from AsyncStorage:', error);
      this.queue = [];
      // Attempt to recover with empty queue
      await this.persist();
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
    // Warn when approaching limit (80% threshold)
    if (this.isNearLimit()) {
      console.warn(`Queue approaching limit: ${this.queue.length}/${MAX_QUEUE_SIZE} operations`);
      // Show user-facing warning when approaching limit
      Alert.alert(
        'Sync Queue Nearly Full',
        `You have ${this.queue.length} pending operations. Consider syncing soon to avoid losing data.`,
        [{ text: 'OK' }]
      );
    }

    // Enforce queue size limit - discard oldest if exceeded
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
      console.warn(`Queue size limit (${MAX_QUEUE_SIZE}) exceeded. Discarding oldest operation.`);
      // Show critical user-facing alert when limit exceeded
      Alert.alert(
        'Sync Queue Full',
        'Your sync queue is full. The oldest pending operation was discarded. Please sync when you have internet connection.',
        [{ text: 'OK' }]
      );
    }

    const operation: QueuedOperation = {
      id: uuidv4(),
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
   * Check if queue is approaching limit
   */
  isNearLimit(): boolean {
    return this.queue.length >= MAX_QUEUE_SIZE * 0.8; // 80% threshold
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
   * Process queue with retry logic
   */
  async processQueue(apiExecutor: (operation: QueuedOperation) => Promise<void>): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pending = this.getPendingOperations();

      for (const operation of pending) {
        try {
          await this.executeWithBackoff(operation, apiExecutor);
          await this.dequeue(operation.id);
        } catch (error) {
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            operation.status = 'failed';
          } else {
            operation.status = 'retrying';
          }

          await this.persist();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute operation with exponential backoff
   */
  private async executeWithBackoff(
    operation: QueuedOperation,
    apiExecutor: (operation: QueuedOperation) => Promise<void>
  ): Promise<void> {
    const delay = Math.pow(2, operation.retryCount) * 1000; // 1s, 2s, 4s, 8s

    if (operation.retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await apiExecutor(operation);
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
