/**
 * Queue Handler - Queue-only operations (no HTTP calls)
 * 
 * Queues operations without attempting HTTP
 * Returns temp ID for tracking
 * Prevents double-queueing when processing queue
 */

import {
  QueueHandlerType,
  CreatePayload,
  UpdatePayload,
} from '../types/HandlerTypes';
import { QueueHandlerOptions } from '../types/GatewayTypes';
import { ApiError, ErrorCode } from '../../../types/errors';
import { operationQueue } from '../../OperationQueue';
import { OperationType, ResourceType } from '../../../types/queue';

/**
 * Queue interface for operations
 */
interface OperationQueue {
  add(operation: QueueOperation): Promise<string>;
  size(): number;
  clear(): void;
}

/**
 * Queue operation structure
 */
interface QueueOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId?: string;
  data?: Record<string, string | number | boolean | null>;
  timestamp: Date;
  retryCount: number;
}

/**
 * Adapter that wraps OperationQueue to match QueueHandler interface
 */
class OperationQueueAdapter implements OperationQueue {
  async add(operation: QueueOperation): Promise<string> {
    const operationType = operation.type as OperationType;
    const resourceType = operation.resourceType as ResourceType;
    
    // Map QueueOperation to OperationQueue.enqueue parameters
    const payload = {
      id: operation.resourceId,
      ...operation.data,
    };
    
    const queuedId = await operationQueue.enqueue(
      operationType,
      resourceType,
      payload,
      3 // default maxRetries
    );
    
    return queuedId;
  }

  size(): number {
    return operationQueue.size();
  }

  clear(): void {
    operationQueue.clear();
  }
}

/**
 * Queue Handler Configuration
 */
export interface QueueHandlerConfig {
  /** Resource type */
  resourceType: string;
  /** Queue instance */
  queue: OperationQueue;
  /** Queue-specific options */
  queueOptions: QueueHandlerOptions;
}

/**
 * Create a Queue Handler for a specific resource
 * 
 * @param resourceType - Resource type (book, author, category)
 * @param config - Queue handler configuration
 * @returns QueueHandler instance (queue-only operations)
 */
export function createQueueHandler<T>(
  resourceType: string,
  config: QueueHandlerConfig
): QueueHandlerType<T> {
  const { queue, queueOptions } = config;

  /**
   * Generate temp ID based on strategy
   */
  const generateTempId = (): string => {
    switch (queueOptions.idGenerationStrategy) {
      case 'uuid':
        return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      case 'timestamp':
        return `temp-${Date.now()}`;
      case 'sequential':
        return `temp-${resourceType}-${Date.now()}`;
      default:
        return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  };

  /**
   * Validate operation before queueing
   */
  const validateOperation = (data: Record<string, string | number | boolean | null> | undefined, operationType: string): void => {
    if (!queueOptions.validateBeforeQueue) {
      return;
    }

    // Basic validation
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, `Invalid ${operationType} data for ${resourceType}`);
    }

    // Type-specific validation could be added here
  };

  /**
   * Check for duplicate operations
   */
  const checkForDuplicates = (_operation: QueueOperation): boolean => {
    if (!queueOptions.deduplicateOperations) {
      return false;
    }

    // This would need access to existing queue items to check duplicates
    // For now, return false (no duplicates found)
    // TODO: Implement actual duplicate detection
    return false;
  };

  /**
   * Queue operation with proper error handling
   */
  const queueOperation = async (
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceId?: string,
    data?: Record<string, string | number | boolean | null>
  ): Promise<string> => {
    const tempId = queueOptions.generateOptimisticIds ? generateTempId() : 
                   (resourceId && operationType !== 'CREATE') ? resourceId : generateTempId();

    const operation: QueueOperation = {
      id: tempId,
      type: operationType,
      resourceType,
      resourceId,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    // Validate operation
    if (operationType === 'CREATE' || operationType === 'UPDATE') {
      validateOperation(data, operationType);
    }

    // Check for duplicates
    if (checkForDuplicates(operation)) {
      return tempId; // Return existing operation ID
    }

    try {
      const queuedId = await queue.add(operation);
      return queuedId;
    } catch (error) {
      throw new ApiError(
        ErrorCode.QUEUE_ERROR,
        `Failed to queue ${operationType} operation: ${error.message}`,
        undefined,
        true // Queue errors are retriable
      );
    }
  };


  // Return the queue handler implementation
  return {
    async create(data: CreatePayload<T>): Promise<string> {
      
      try {
        const tempId = await queueOperation('CREATE', undefined, data);
        return tempId;
      } catch (error) {
        throw error;
      }
    },

    async update(id: string, data: UpdatePayload<T>): Promise<string> {
      
      try {
        const tempId = await queueOperation('UPDATE', id, data);
        return tempId;
      } catch (error) {
        throw error;
      }
    },

    async delete(id: string): Promise<string> {
      
      try {
        const tempId = await queueOperation('DELETE', id);
        return tempId;
      } catch (error) {
        throw error;
      }
    },
  };
}

/**
 * Default Queue Handler configuration
 */
export const createDefaultQueueHandlerConfig = (
  resourceType: string,
  queue?: OperationQueue
): QueueHandlerConfig => ({
  resourceType,
  queue: queue || new OperationQueueAdapter(),
  queueOptions: {
    generateOptimisticIds: true,
    idGenerationStrategy: 'uuid',
    validateBeforeQueue: true,
    deduplicateOperations: true,
    conflictResolution: 'last-write-wins',
  },
});

/**
 * Queue Handler factory for common resource types
 */
export class QueueHandlerFactory {
  private config: QueueHandlerConfig;

  constructor(config: QueueHandlerConfig) {
    this.config = config;
  }

  /**
   * Create a Book queue handler
   */
  createBookHandler<T>(): QueueHandlerType<T> {
    return createQueueHandler<T>('book', this.config);
  }

  /**
   * Create an Author queue handler
   */
  createAuthorHandler<T>(): QueueHandlerType<T> {
    return createQueueHandler<T>('author', this.config);
  }

  /**
   * Create a Category queue handler
   */
  createCategoryHandler<T>(): QueueHandlerType<T> {
    return createQueueHandler<T>('category', this.config);
  }

  /**
   * Create a handler for any resource type
   */
  createHandler<T>(resourceType: string): QueueHandlerType<T> {
    return createQueueHandler<T>(resourceType, { ...this.config, resourceType });
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QueueHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; resourceType: string } {
    return {
      size: this.config.queue.size(),
      resourceType: this.config.resourceType,
    };
  }

  /**
   * Clear queue (for testing)
   */
  clearQueue(): void {
    this.config.queue.clear();
  }
}