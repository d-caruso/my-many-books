/**
 * Book Handler Integration
 * 
 * Connects book handlers with existing queue system and ID mapping service
 * Ensures backward compatibility with Phase 2-5 infrastructure
 */

import { OperationQueue } from '../../OperationQueue';
import { IDMappingService } from '../../sync/IDMappingService';
import { BookHandlerFactory, Book, CreateBookPayload, UpdateBookPayload } from '../BookHandlers';
import { ResourceType } from '../../../types/queue';

// Ensure book is recognized as a valid resource type
const BOOK_RESOURCE: ResourceType = 'book';

export class BookHandlerIntegration {
  private operationQueue: OperationQueue;
  private idMappingService: IDMappingService;
  private initialized = false;

  constructor(
    operationQueue: OperationQueue,
    idMappingService: IDMappingService
  ) {
    this.operationQueue = operationQueue;
    this.idMappingService = idMappingService;
  }

  /**
   * Initialize the integration service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.operationQueue.initialize();
    await this.idMappingService.initialize();
    this.initialized = true;
  }

  /**
   * Create handlers that are properly integrated with queue system
   */
  createIntegratedHandlers(httpClient: Record<string, unknown>, networkProvider: Record<string, unknown>) {
    this.ensureInitialized();

    return {
      // Client gateway with queue integration for error fallback
      clientGateway: this.wrapWithIDMapping(
        BookHandlerFactory.createClientGateway(httpClient)
      ),

      // Mobile handler with queue and ID mapping
      mobileHandler: this.wrapWithIDMapping(
        BookHandlerFactory.createMobileHandler(httpClient, this.operationQueue, networkProvider)
      ),

      // Queue handler with ID mapping
      queueHandler: this.wrapWithIDMapping(
        BookHandlerFactory.createQueueHandler(this.operationQueue)
      ),
    };
  }

  /**
   * Wrap handlers with ID mapping support
   */
  private wrapWithIDMapping(handler: Record<string, unknown>) {
    const typedHandler = handler as {
      create: (data: CreateBookPayload) => Promise<Book | string>;
      update: (id: string, data: UpdateBookPayload) => Promise<Book | string>;
      delete: (id: string) => Promise<void>;
      read: (id: string) => Promise<Book>;
      list: (filters?: Record<string, unknown>) => Promise<Book[]>;
    };

    return {
      async create(data: CreateBookPayload): Promise<Book> {
        const result = await typedHandler.create(data);
        
        // If result has a temporary ID, register it for mapping
        if (typeof result === 'string' && result.startsWith('temp-')) {
          // For queue operations, result is temp ID
          return {
            id: result,
            ...data,
            creationDate: new Date().toISOString(),
            updateDate: new Date().toISOString(),
          } as Book;
        }
        
        // For HTTP operations, result is the full book object
        return result as Book;
      },

      async update(id: string, data: UpdateBookPayload): Promise<Book> {
        // Resolve real server ID if this is a temp ID
        const realId = await this.resolveId(id);
        const result = await typedHandler.update(realId, data);
        
        // Handle both temp ID responses and full book responses
        if (typeof result === 'string') {
          // Queue operation returned temp ID
          return {
            id: result,
            ...data,
            updateDate: new Date().toISOString(),
          } as Book;
        }
        
        return result as Book;
      },

      async delete(id: string): Promise<void> {
        // Resolve real server ID if this is a temp ID
        const realId = await this.resolveId(id);
        return typedHandler.delete(realId);
      },

      async read(id: string): Promise<Book> {
        // Resolve real server ID if this is a temp ID
        const realId = await this.resolveId(id);
        return typedHandler.read(realId);
      },

      async list(filters?: Record<string, unknown>): Promise<Book[]> {
        return typedHandler.list(filters);
      },
    };
  }

  /**
   * Resolve temporary ID to real server ID if needed
   */
  private async resolveId(id: string): Promise<string> {
    if (!id.startsWith('temp-')) {
      return id;
    }

    // Try to get real server ID from mapping
    const serverId = await this.idMappingService.getServerId(id);
    if (serverId !== null) {
      return serverId.toString();
    }

    // If no mapping exists, keep the temp ID (might be pending sync)
    return id;
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized() {
    if (!this.initialized) {
      throw new Error('BookHandlerIntegration must be initialized before use');
    }
  }

  /**
   * Get queue status for books
   */
  async getQueueStatus(): Promise<{
    totalOperations: number;
    bookOperations: number;
    pendingBooks: number;
    failedBooks: number;
  }> {
    this.ensureInitialized();
    
    const queueSize = this.operationQueue.size();
    const pendingOperations = this.operationQueue.getPendingOperations();
    const failedOperations = this.operationQueue.getFailedOperations();
    
    const bookPending = pendingOperations.filter(op => op.resource === BOOK_RESOURCE).length;
    const bookFailed = failedOperations.filter(op => op.resource === BOOK_RESOURCE).length;
    const totalBookOps = bookPending + bookFailed;

    return {
      totalOperations: queueSize,
      bookOperations: totalBookOps,
      pendingBooks: bookPending,
      failedBooks: bookFailed,
    };
  }

  /**
   * Force sync all pending book operations
   */
  async syncPendingBooks(): Promise<void> {
    this.ensureInitialized();
    // This would trigger the existing queue processing system
    // The implementation depends on how QueueExecutor is structured
    // TODO: Implement with proper logging via hookey when added to mobile
  }

  /**
   * Clear failed book operations (with user confirmation)
   */
  async clearFailedBooks(): Promise<number> {
    this.ensureInitialized();
    
    const failedOperations = this.operationQueue.getFailedOperations();
    const failedBookOperations = failedOperations.filter(
      op => op.resource === BOOK_RESOURCE
    );

    for (const operation of failedBookOperations) {
      await this.operationQueue.remove(operation.id);
    }

    return failedBookOperations.length;
  }
}

// Singleton instance factory
let bookHandlerIntegration: BookHandlerIntegration | null = null;

export function getBookHandlerIntegration(
  operationQueue: OperationQueue,
  idMappingService: IDMappingService
): BookHandlerIntegration {
  if (!bookHandlerIntegration) {
    bookHandlerIntegration = new BookHandlerIntegration(operationQueue, idMappingService);
  }
  return bookHandlerIntegration;
}

/**
 * Convenience function to create fully integrated book handlers
 */
export async function createIntegratedBookHandlers(
  httpClient: Record<string, unknown>,
  networkProvider: Record<string, unknown>,
  operationQueue: OperationQueue,
  idMappingService: IDMappingService
) {
  const integration = getBookHandlerIntegration(operationQueue, idMappingService);
  await integration.initialize();
  return integration.createIntegratedHandlers(httpClient, networkProvider);
}