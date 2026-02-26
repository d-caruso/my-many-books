import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { QueuedOperation, OperationType, ResourceType, BookOperationPayload, AuthorOperationPayload, CategoryOperationPayload, UserOperationPayload, SettingsOperationPayload } from '../types/queue';
import { Alert } from 'react-native';
import i18n from '../i18n';
import { databaseService } from './database/DatabaseService';
import { mobileHooks, MOBILE_EVENTS } from './hooks/mobileHooks';
import { QUEUE_OPERATION_STATUS, QUEUE_SIZE_STATUS, RETRY_REASONS } from './hooks/eventsSchema';
import { HEALTH_STATUS } from '@my-many-books/shared-types';
import { SyncStatus, SYNC_STATUS } from '@/types';

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
      mobileHooks.emit(MOBILE_EVENTS.ERROR.STORAGE, {
        operation: 'queue_initialize',
        error: error instanceof Error ? error.message : String(error),
        recovery: 'empty_queue_created'
      });
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
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.SIZE_CHANGED, {
        queueSize: this.queue.length,
        maxSize: MAX_QUEUE_SIZE,
        status: QUEUE_SIZE_STATUS.APPROACHING_LIMIT,
        threshold: 0.8
      });
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
      const discarded = this.queue.shift(); // Remove oldest
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.SIZE_CHANGED, {
        queueSize: this.queue.length,
        maxSize: MAX_QUEUE_SIZE,
        status: QUEUE_SIZE_STATUS.LIMIT_EXCEEDED,
        action: 'discarded_oldest',
        discardedOperation: discarded?.id
      });
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
      status: QUEUE_OPERATION_STATUS.PENDING,
    };

    this.queue.push(operation);
    
    // Emit enqueue event
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.ENQUEUE, {
      operationId: operation.id,
      type: operation.type,
      resource: operation.resource,
      queueSize: this.queue.length,
      maxRetries: operation.maxRetries
    });
    
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
    const operation = this.queue.find(op => op.id === operationId);
    this.queue = this.queue.filter(op => op.id !== operationId);
    
    // Emit dequeue event
    if (operation) {
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.DEQUEUE, {
        operationId: operation.id,
        type: operation.type,
        resource: operation.resource,
        queueSize: this.queue.length,
        remainingOperations: this.queue.length
      });
    }
    
    await this.persist();
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status === QUEUE_OPERATION_STATUS.PENDING || op.status === QUEUE_OPERATION_STATUS.RETRYING);
  }

  /**
   * Get all operations that can be processed (pending, retrying, and retryable failed)
   */
  getProcessableOperations(): QueuedOperation[] {
    return this.queue.filter(op => 
      op.status === QUEUE_OPERATION_STATUS.PENDING || 
      op.status === QUEUE_OPERATION_STATUS.RETRYING ||
      (op.status === QUEUE_OPERATION_STATUS.FAILED && this.shouldRetryFailedOperation(op))
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
    const clearedCount = this.queue.length;
    this.queue = [];
    
    // Emit queue cleared event
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.CLEARED, {
      clearedOperations: clearedCount,
      queueSize: 0,
      timestamp: new Date().toISOString(),
      reason: 'manual_clear'
    });
    
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

    const processable = this.getProcessableOperations();
    const startTime = Date.now();
    
    // Emit queue processing start event
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.PROCESS.START, {
      queueSize: this.queue.length,
      processableOperations: processable.length,
      timestamp: new Date().toISOString(),
      sessionId: `process-${startTime}`
    });

    let processedCount = 0;
    let failedCount = 0;

    try {
      for (const operation of processable) {
        // Handle cross-session retry - increment counter if this is a failed operation being retried
        if (operation.status === QUEUE_OPERATION_STATUS.FAILED) {
          operation.crossSessionRetries = (operation.crossSessionRetries || 0) + 1;
          operation.status = QUEUE_OPERATION_STATUS.RETRYING;
          
          mobileHooks.emit(MOBILE_EVENTS.QUEUE.RETRY, {
            operationId: operation.id,
            type: operation.type,
            resource: operation.resource,
            retryCount: operation.retryCount,
            maxRetries: operation.maxRetries,
            crossSessionRetries: operation.crossSessionRetries,
            reason: RETRY_REASONS.CROSS_SESSION_RETRY
          });
        }
        
        try {
          await this.executeWithBackoff(operation, apiExecutor);
          await this.dequeue(operation.id);
          processedCount++;
        } catch {
          operation.retryCount++;
          failedCount++;

          if (operation.retryCount >= operation.maxRetries) {
            operation.status = QUEUE_OPERATION_STATUS.FAILED;
            operation.lastFailedAt = Date.now();
            operation.crossSessionRetries = (operation.crossSessionRetries || 0);
            operation.retryCount = 0; // Reset for cross-session retry
            
            mobileHooks.emit(MOBILE_EVENTS.QUEUE.FAILED, {
              operationId: operation.id,
              type: operation.type,
              resource: operation.resource,
              retryCount: operation.retryCount,
              maxRetries: operation.maxRetries,
              reason: RETRY_REASONS.MAX_RETRIES_EXCEEDED,
              crossSessionRetries: operation.crossSessionRetries
            });
          } else {
            operation.status = QUEUE_OPERATION_STATUS.RETRYING;
            mobileHooks.emit(MOBILE_EVENTS.QUEUE.RETRY, {
              operationId: operation.id,
              type: operation.type,
              resource: operation.resource,
              retryCount: operation.retryCount,
              maxRetries: operation.maxRetries,
              nextAttempt: operation.retryCount + 1
            });
          }

          await this.persist();
        }
      }
    } finally {
      const endTime = Date.now();
      const processingDuration = endTime - startTime;
      
      // Emit queue processing complete event
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.PROCESS.COMPLETE, {
        queueSize: this.queue.length,
        processedOperations: processedCount,
        failedOperations: failedCount,
        processingDuration,
        timestamp: new Date().toISOString(),
        sessionId: `process-${startTime}`
      });
      
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
      await this.updateBookSyncStatus(String(operation.payload.id), SYNC_STATUS.SYNCING);
    }

    try {
      await apiExecutor(operation);
      
      // Mark as synced on success
      if (operation.resource === 'book' && operation.payload?.id) {
        await this.updateBookSyncStatus(String(operation.payload.id), SYNC_STATUS.SYNCED);
      }
    } catch (error) {
      // Mark as failed or pending for retry
      if (operation.resource === 'book' && operation.payload?.id) {
        const status = operation.retryCount >= operation.maxRetries - 1 ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING;
        await this.updateBookSyncStatus(String(operation.payload.id), status);
      }
      throw error;
    }
  }

  /**
   * Update book sync status in database (Phase 3 fix)
   */
  private async updateBookSyncStatus(bookId: string, status: SyncStatus): Promise<void> {
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
      mobileHooks.emit(MOBILE_EVENTS.ERROR.STORAGE, {
        operation: 'update_book_sync_status',
        error: error instanceof Error ? error.message : String(error),
        bookId,
        status,
        source: 'OperationQueue'
      });
    }
  }

  /**
   * Get failed operations for cleanup service access (Phase 5 fix)
   */
  getFailedOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status === QUEUE_OPERATION_STATUS.FAILED);
  }

  /**
   * Retry a failed operation by resetting its status to pending
   */
  async retryOperation(operationId: string): Promise<void> {
    const operation = this.queue.find(op => op.id === operationId);
    if (operation && operation.status === QUEUE_OPERATION_STATUS.FAILED) {
      operation.status = QUEUE_OPERATION_STATUS.PENDING;
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
      operation.status = QUEUE_OPERATION_STATUS.PENDING;
      operation.retryCount = 0; // Reset retry count for manual retry
    }
    await this.persist();
  }

  /**
   * Get queue health metrics
   */
  getQueueHealth(): {
    total: number;
    pending: number;
    retrying: number;
    failed: number;
    healthScore: number;
    isHealthy: boolean;
    oldestOperation?: number;
  } {
    const pending = this.queue.filter(op => op.status === QUEUE_OPERATION_STATUS.PENDING).length;
    const retrying = this.queue.filter(op => op.status === QUEUE_OPERATION_STATUS.RETRYING).length;
    const failed = this.getFailedOperations().length;
    const total = this.queue.length;

    // Calculate health score (0-100, higher is better)
    // Healthy queue has few failed operations and doesn't approach size limit
    const failureRate = total > 0 ? (failed / total) : 0;
    const capacityUsage = total / MAX_QUEUE_SIZE;
    const healthScore = Math.round((1 - failureRate) * (1 - capacityUsage) * 100);

    // Find oldest operation timestamp for staleness detection
    const oldestOperation = this.queue.length > 0 
      ? Math.min(...this.queue.map(op => op.timestamp))
      : undefined;

    const isHealthy = healthScore > 70 && failureRate < 0.2 && capacityUsage < 0.8;

    const metrics = {
      total,
      pending,
      retrying,
      failed,
      healthScore,
      isHealthy,
      oldestOperation,
    };

    // Emit queue health metrics
    mobileHooks.emit(MOBILE_EVENTS.QUEUE.SIZE_CHANGED, {
      ...metrics,
      maxSize: MAX_QUEUE_SIZE,
      capacityUsage,
      failureRate,
      timestamp: new Date().toISOString(),
      status: isHealthy ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED
    });

    return metrics;
  }

  /**
   * Monitor queue health and emit warnings
   */
  monitorQueueHealth(): void {
    const health = this.getQueueHealth();
    const now = Date.now();

    // Check for stale operations (older than 1 hour)
    if (health.oldestOperation && (now - health.oldestOperation) > (60 * 60 * 1000)) {
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.SIZE_CHANGED, {
        ...health,
        status: QUEUE_SIZE_STATUS.STALE_OPERATIONS,
        staleDuration: now - health.oldestOperation,
        timestamp: new Date().toISOString(),
        warning: 'operations_aging'
      });
    }

    // Check for high failure rate
    if (health.failed > 0 && (health.failed / health.total) > 0.3) {
      mobileHooks.emit(MOBILE_EVENTS.QUEUE.SIZE_CHANGED, {
        ...health,
        status: QUEUE_SIZE_STATUS.HIGH_FAILURE_RATE,
        timestamp: new Date().toISOString(),
        warning: 'excessive_failures'
      });
    }
  }

  /**
   * Check if a failed operation should be retried based on cross-session backoff
   */
  private shouldRetryFailedOperation(operation: QueuedOperation): boolean {
    if (!operation.lastFailedAt) {
      return false; // No failure timestamp, don't retry
    }

    const crossSessionRetries = operation.crossSessionRetries || 0;
    const maxCrossSessionRetries = 3; // Maximum cross-session retry attempts

    if (crossSessionRetries >= maxCrossSessionRetries) {
      return false; // Exceeded max cross-session retries
    }

    // Exponential backoff: 1 hour, 4 hours, 16 hours
    const timeSinceFailure = Date.now() - operation.lastFailedAt;
    const backoffDelayMs = Math.pow(4, crossSessionRetries) * 60 * 60 * 1000; // hours in milliseconds

    return timeSinceFailure > backoffDelayMs;
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      mobileHooks.emit(MOBILE_EVENTS.ERROR.STORAGE, {
        operation: 'queue_persist',
        error: error instanceof Error ? error.message : String(error),
        queueSize: this.queue.length
      });
    }
  }
}

// Singleton instance
export const operationQueue = new OperationQueue();
