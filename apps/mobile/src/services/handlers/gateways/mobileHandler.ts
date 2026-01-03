/**
 * Mobile Handler - Auto-queueing when offline
 * 
 * Try HTTP first when online, automatically queue operation when offline
 * Return optimistic response for UI
 */

import {
  MobileHandlerType,
  CreatePayload,
  UpdatePayload,
  FilterOptions,
  NetworkState,
} from '../types/HandlerTypes';
import { MobileHandlerOptions, DEFAULT_GATEWAY_CONFIG } from '../types/GatewayTypes';
import { ClientGatewayConfig, createClientGateway } from './clientGateway';

/**
 * Queue interface for offline operations
 * Uses existing OperationQueue from mobile app
 */
interface OperationQueue {
  add(operation: QueueOperation): Promise<string>;
  executeAll(): Promise<void>;
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
  data?: unknown;
  timestamp: Date;
  retryCount: number;
}

/**
 * Network state provider interface
 */
interface NetworkStateProvider {
  isOnline(): boolean;
  getState(): NetworkState;
  onChange(callback: (state: NetworkState) => void): () => void;
}

/**
 * Mobile Handler Configuration
 */
export interface MobileHandlerConfig extends ClientGatewayConfig {
  /** Queue instance for offline operations */
  queue: OperationQueue;
  /** Network state provider */
  networkProvider: NetworkStateProvider;
  /** Mobile-specific options */
  mobileOptions: MobileHandlerOptions;
}

/**
 * Create a Mobile Handler for a specific resource
 * 
 * @param resourceType - Resource type (book, author, category)
 * @param config - Mobile handler configuration
 * @returns MobileHandler instance with auto-queueing
 */
export function createMobileHandler<T>(
  resourceType: string,
  config: MobileHandlerConfig
): MobileHandlerType<T> {
  const { queue, networkProvider, mobileOptions, ...clientConfig } = config;
  
  // Create underlying client gateway for online operations
  const clientGateway = createClientGateway<T>(resourceType, clientConfig);

  /**
   * Generate optimistic response for queued operations
   */
  const createOptimisticResponse = (data: CreatePayload<T>, tempId: string): T => {
    if (!mobileOptions.optimisticUpdates) {
      throw new Error('Operation queued for offline processing');
    }

    // Create optimistic response with temp ID
    return {
      ...data,
      id: tempId,
      creationDate: new Date().toISOString(),
      updateDate: new Date().toISOString(),
    } as T;
  };

  /**
   * Create optimistic update response
   */
  const createOptimisticUpdate = (id: string, data: UpdatePayload<T>, original?: T): T => {
    if (!mobileOptions.optimisticUpdates) {
      throw new Error('Update queued for offline processing');
    }

    // Create optimistic response by merging update data
    const base = original || ({} as T);
    return {
      ...base,
      ...data,
      id,
      updateDate: new Date().toISOString(),
    } as T;
  };

  /**
   * Queue operation with proper error handling
   */
  const queueOperation = async (
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    resourceId: string | undefined,
    data?: unknown
  ): Promise<string> => {
    const operation: QueueOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: operationType,
      resourceType,
      resourceId,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    try {
      const tempId = await queue.add(operation);
      
      // Show notification if enabled
      if (mobileOptions.notifyOnQueue) {
        // This would integrate with notification system
        // TODO: Integrate with proper notification system
        // console.log(`Operation queued: ${operationType} ${resourceType}`);
      }

      return tempId;
    } catch (error) {
      throw new Error(`Failed to queue operation: ${error.message}`);
    }
  };

  /**
   * Try online operation first, fallback to queue
   */
  const tryOnlineOrQueue = async <R>(
    onlineOperation: () => Promise<R>,
    queueFallback: () => Promise<R>
  ): Promise<R> => {
    const isOnline = networkProvider.isOnline();
    
    if (isOnline) {
      try {
        // Try online operation first
        const result = await Promise.race([
          onlineOperation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), mobileOptions.queueTimeout)
          )
        ]);
        return result;
      } catch (error) {
        // Check if we should fallback to queue
        const shouldQueue = error.message.includes('timeout') ||
                           error.message.includes('Network Error') ||
                           error.message.includes('No internet connection');

        if (shouldQueue) {
          // TODO: Integrate with proper logging system
          // console.warn(`Online operation failed, queueing: ${error.message}`);
          return await queueFallback();
        } else {
          throw error;
        }
      }
    } else {
      // Offline - queue immediately
      return await queueFallback();
    }
  };


  // Return the mobile handler implementation
  return {
    async create(data: CreatePayload<T>): Promise<T> {

      const onlineOperation = () => clientGateway.create!(data);
      const queueFallback = async () => {
        const tempId = await queueOperation('CREATE', undefined, data);
        return createOptimisticResponse(data, tempId);
      };

      return tryOnlineOrQueue(onlineOperation, queueFallback);
    },

    async update(id: string, data: UpdatePayload<T>): Promise<T> {

      const onlineOperation = () => clientGateway.update!(id, data);
      const queueFallback = async () => {
        await queueOperation('UPDATE', id, data);
        
        // Try to get original data for optimistic update
        let original: T | undefined;
        if (mobileOptions.offlineCacheFallback) {
          try {
            // This would integrate with cache/SQLite storage
            // original = await getCachedResource(resourceType, id);
          } catch {
            // TODO: Integrate with proper logging system
            // console.warn('Could not retrieve cached data for optimistic update');
          }
        }
        
        return createOptimisticUpdate(id, data, original);
      };

      return tryOnlineOrQueue(onlineOperation, queueFallback);
    },

    async delete(id: string): Promise<void> {

      const onlineOperation = () => clientGateway.delete!(id);
      const queueFallback = async () => {
        await queueOperation('DELETE', id);
        // Delete operations don't return data
        return undefined;
      };

      await tryOnlineOrQueue(onlineOperation, queueFallback);
    },

    async read(id: string): Promise<T> {
      
      // Read operations try online first, then fallback to cache
      const isOnline = networkProvider.isOnline();
      
      if (isOnline) {
        try {
          return await clientGateway.read!(id);
        } catch (error) {
          if (mobileOptions.offlineCacheFallback) {
            // Try cache fallback
            // TODO: Integrate with proper logging system
            // console.warn('Online read failed, attempting cache fallback');
            // This would integrate with cache/SQLite storage
            throw new Error('Cache fallback not implemented yet');
          }
          throw error;
        }
      } else {
        if (mobileOptions.offlineCacheFallback) {
          // Use cached data when offline
          // This would integrate with cache/SQLite storage
          throw new Error('Offline cache not implemented yet');
        } else {
          throw new Error('Cannot read data while offline');
        }
      }
    },

    async list(filters?: FilterOptions<T>): Promise<T[]> {
      
      // List operations try online first, then fallback to cache
      const isOnline = networkProvider.isOnline();
      
      if (isOnline) {
        try {
          return await clientGateway.list!(filters);
        } catch (error) {
          if (mobileOptions.offlineCacheFallback) {
            // Try cache fallback
            // TODO: Integrate with proper logging system
            // console.warn('Online list failed, attempting cache fallback');
            // This would integrate with cache/SQLite storage
            return [];
          }
          throw error;
        }
      } else {
        if (mobileOptions.offlineCacheFallback) {
          // Use cached data when offline
          // This would integrate with cache/SQLite storage
          return [];
        } else {
          throw new Error('Cannot list data while offline');
        }
      }
    },
  };
}

/**
 * Default Mobile Handler configuration
 */
interface DefaultHttpClient {
  get<T>(url: string, config?: Record<string, unknown>): Promise<T>;
  post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  put<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T>;
  delete<T>(url: string, config?: Record<string, unknown>): Promise<T>;
}

export const createDefaultMobileHandlerConfig = (
  httpClient: DefaultHttpClient,
  queue: OperationQueue,
  networkProvider: NetworkStateProvider
): MobileHandlerConfig => ({
  baseURL: DEFAULT_GATEWAY_CONFIG.baseURL,
  httpClient,
  options: {
    failFast: false, // Mobile handler doesn't fail fast
    enableCaching: true,
    cacheTTL: 300000,
    validateResponses: true,
  },
  timeout: DEFAULT_GATEWAY_CONFIG.timeout,
  defaultHeaders: DEFAULT_GATEWAY_CONFIG.defaultHeaders,
  queue,
  networkProvider,
  mobileOptions: {
    optimisticUpdates: true,
    offlineCacheFallback: true,
    retryOnRecovery: true,
    queueTimeout: 5000,
    notifyOnQueue: false,
  },
});

/**
 * Mobile Handler factory for common resource types
 */
export class MobileHandlerFactory {
  private config: MobileHandlerConfig;

  constructor(config: MobileHandlerConfig) {
    this.config = config;
  }

  /**
   * Create a Book mobile handler
   */
  createBookHandler<T>(): MobileHandlerType<T> {
    return createMobileHandler<T>('book', this.config);
  }

  /**
   * Create an Author mobile handler
   */
  createAuthorHandler<T>(): MobileHandlerType<T> {
    return createMobileHandler<T>('author', this.config);
  }

  /**
   * Create a Category mobile handler
   */
  createCategoryHandler<T>(): MobileHandlerType<T> {
    return createMobileHandler<T>('category', this.config);
  }

  /**
   * Create a handler for any resource type
   */
  createHandler<T>(resourceType: string): MobileHandlerType<T> {
    return createMobileHandler<T>(resourceType, this.config);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MobileHandlerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { size: number; isProcessing: boolean } {
    return {
      size: this.config.queue.size(),
      isProcessing: false, // This would need to be implemented in the queue
    };
  }

  /**
   * Process queued operations
   */
  async processQueue(): Promise<void> {
    if (this.config.networkProvider.isOnline()) {
      await this.config.queue.executeAll();
    } else {
      throw new Error('Cannot process queue while offline');
    }
  }
}