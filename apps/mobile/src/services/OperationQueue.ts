import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { QueuedOperation, OperationType, ResourceType, BookOperationPayload, AuthorOperationPayload, CategoryOperationPayload, UserOperationPayload, SettingsOperationPayload } from '../types/queue';
import { Alert } from 'react-native';
import i18n from '../i18n';
import { databaseService } from './database/DatabaseService';

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
   * Add operation to queue - overloaded for type safety
   */
  async enqueue(
    type: OperationType,
    resource: 'book',
    payload: BookOperationPayload,
    maxRetries?: number
  ): Promise<string>;
  async enqueue(
    type: OperationType,
    resource: 'author',
    payload: AuthorOperationPayload,
    maxRetries?: number
  ): Promise<string>;
  async enqueue(
    type: OperationType,
    resource: 'category',
    payload: CategoryOperationPayload,
    maxRetries?: number
  ): Promise<string>;
  async enqueue(
    type: OperationType,
    resource: 'user',
    payload: UserOperationPayload,
    maxRetries?: number
  ): Promise<string>;
  async enqueue(
    type: OperationType,
    resource: 'settings',
    payload: SettingsOperationPayload,
    maxRetries?: number
  ): Promise<string>;
  async enqueue(
    type: OperationType,
    resource: ResourceType,
    payload: BookOperationPayload | AuthorOperationPayload | CategoryOperationPayload | UserOperationPayload | SettingsOperationPayload,
    maxRetries: number = 3
  ): Promise<string> {
    // Warn when approaching limit (80% threshold)
    if (this.isNearLimit()) {
      console.warn(`Queue approaching limit: ${this.queue.length}/${MAX_QUEUE_SIZE} operations`);
      // Show user-facing warning when approaching limit (skip in test environment)
      if (process.env.NODE_ENV !== 'test') {
        Alert.alert(
          i18n.t('sync.queue.alerts.nearlyFullTitle', { ns: 'offline' }),
          i18n.t('sync.queue.alerts.nearlyFullMessage', { count: this.queue.length, ns: 'offline' }),
          [{ text: i18n.t('sync.queue.alerts.okButton', { ns: 'offline' }) }]
        );
      }
    }

    // Enforce queue size limit - discard oldest if exceeded
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
      console.warn(`Queue size limit (${MAX_QUEUE_SIZE}) exceeded. Discarding oldest operation.`);
      // Show critical user-facing alert when limit exceeded (skip in test environment)
      if (process.env.NODE_ENV !== 'test') {
        Alert.alert(
          i18n.t('sync.queue.alerts.fullTitle', { ns: 'offline' }),
          i18n.t('sync.queue.alerts.fullMessage', { ns: 'offline' }),
          [{ text: i18n.t('sync.queue.alerts.okButton', { ns: 'offline' }) }]
        );
      }
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
   * Get all operations that can be processed (pending, retrying, and retryable failed)
   */
  getProcessableOperations(): QueuedOperation[] {
    return this.queue.filter(op => 
      op.status === 'pending' || 
      op.status === 'retrying' ||
      (op.status === 'failed' && op.retryCount < op.maxRetries)
    );
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
      const processable = this.getProcessableOperations();

      for (const operation of processable) {
        try {
          await this.executeWithBackoff(operation, apiExecutor);
          await this.dequeue(operation.id);
        } catch {
          operation.retryCount++;

          if (operation.retryCount >= operation.maxRetries) {
            operation.status = 'failed';
            console.log(`Operation ${operation.id} failed permanently after ${operation.maxRetries} retries`);
          } else {
            operation.status = 'retrying';
            console.log(`Operation ${operation.id} will retry (attempt ${operation.retryCount + 1}/${operation.maxRetries})`);
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

    // Mark book as syncing before processing (Phase 3 fix)
    if (operation.resource === 'book' && operation.payload?.id) {
      await this.updateBookSyncStatus(String(operation.payload.id), 'syncing');
    }

    try {
      await apiExecutor(operation);
      
      // Mark as synced on success
      if (operation.resource === 'book' && operation.payload?.id) {
        await this.updateBookSyncStatus(String(operation.payload.id), 'synced');
      }
    } catch (error) {
      // Mark as failed or pending for retry
      if (operation.resource === 'book' && operation.payload?.id) {
        const status = operation.retryCount >= operation.maxRetries - 1 ? 'failed' : 'pending';
        await this.updateBookSyncStatus(String(operation.payload.id), status);
      }
      throw error;
    }
  }

  /**
   * Update book sync status in database (Phase 3 fix)
   */
  private async updateBookSyncStatus(bookId: string, status: 'syncing' | 'synced' | 'failed' | 'pending'): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'test') {
        // Skip database updates in test environment
        return;
      }
      
      await databaseService.executeQuery(
        'UPDATE books SET _sync_status = ? WHERE id = ? OR _temp_id = ?',
        [status, bookId, bookId]
      );
    } catch (error) {
      console.error('Failed to update book sync status:', error);
    }
  }

  /**
   * Get failed operations for cleanup service access (Phase 5 fix)
   */
  getFailedOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status === 'failed');
  }

  /**
   * Retry a failed operation by resetting its status to pending
   */
  async retryOperation(operationId: string): Promise<void> {
    const operation = this.queue.find(op => op.id === operationId);
    if (operation && operation.status === 'failed') {
      operation.status = 'pending';
      operation.retryCount = 0; // Reset retry count for manual retry
      await this.persist();
    }
  }

  /**
   * Retry all failed operations
   */
  async retryAllFailedOperations(): Promise<void> {
    const failedOps = this.getFailedOperations();
    for (const operation of failedOps) {
      operation.status = 'pending';
      operation.retryCount = 0; // Reset retry count for manual retry
    }
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
