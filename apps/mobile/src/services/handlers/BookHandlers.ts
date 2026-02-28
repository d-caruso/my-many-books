/**
 * ============================================================================
 * IMPORTANT: These handlers are NOT currently integrated into the app.
 * ============================================================================
 *
 * The app uses `bookAPI` + `withQueueOnError` wrapper (in api.ts) for all
 * runtime operations. These handler factories provide an alternative OOP
 * approach with the same functionality.
 *
 * Status: Fully implemented, NOT integrated (dead code)
 *
 * To integrate, you would need:
 * 1. Create NetworkStateProvider adapter for NetInfo (sync isOnline() method)
 * 2. Export httpClient singleton from http/ directory
 * 3. Replace bookAPI calls with handler.create/update/delete calls
 *
 * See docs/ARCHITECTURE_OVERVIEW.md for comparison table and details.
 * ============================================================================
 *
 * Book Handler Variants with Hookey Integration
 *
 * Three handler patterns for different use cases:
 * - bookClientGateway: Pure HTTP (web-app pattern, fail-fast when offline)
 * - bookMobileHandler: Auto-queueing hybrid (try online first, queue when offline)
 * - bookQueueHandler: Queue-only (no HTTP, prevents double-queueing)
 *
 * All handlers emit hookey events for observability and tracking.
 */

import { createClientGateway, createDefaultClientGatewayConfig, HttpClient } from './gateways/clientGateway';
import { createMobileHandler, createDefaultMobileHandlerConfig, ExecutableQueue, NetworkStateProvider } from './gateways/mobileHandler';
import { createQueueHandler, createDefaultQueueHandlerConfig, OperationQueue } from './gateways/queueHandler';
import { ClientGatewayHandler, MobileHandlerType, QueueHandlerType } from './types/HandlerTypes';
import { 
  validateCreateBookAndThrow, 
  validateUpdateBookAndThrow, 
  hasUpdateFields,
  BookValidationError 
} from './validation/BookValidation';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

// Book type definition (will be replaced with shared types in Phase 2)
export interface Book {
  id: string;
  title: string;
  author: string;
  status: 'want-to-read' | 'reading' | 'paused' | 'completed';
  isbn?: string;
  description?: string;
  pageCount?: number;
  rating?: number;
  creationDate: string;
  updateDate: string;
}

export interface CreateBookPayload {
  title: string;
  author: string;
  status: 'want-to-read' | 'reading' | 'paused' | 'completed';
  isbn?: string;
  description?: string;
  pageCount?: number;
  rating?: number;
}

export interface UpdateBookPayload {
  title?: string;
  author?: string;
  status?: 'want-to-read' | 'reading' | 'paused' | 'completed';
  isbn?: string;
  description?: string;
  pageCount?: number;
  rating?: number;
}

// Helper function to generate unique operation IDs
const generateOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create event metadata
const createEventMetadata = (operationId: string, bookData?: Partial<Book | CreateBookPayload | UpdateBookPayload>) => ({
  operationId,
  resourceType: 'book' as const,
  timestamp: new Date().toISOString(),
  metadata: bookData ? {
    bookId: 'id' in bookData ? bookData.id : undefined,
    title: bookData.title,
    author: bookData.author,
    status: bookData.status,
  } : undefined,
});

// Validated book handler wrappers with hookey integration
class ValidatedBookHandler<THandler extends object> {
  constructor(private handler: THandler) {}

  // Wrap create method with validation and hookey events
  async create(data: CreateBookPayload): Promise<Book | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, data);
    
    // Emit start event (fire and forget)
    mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.START, eventMetadata);
    
    try {
      validateCreateBookAndThrow(data);
      const result = await (this.handler as unknown as { create: (data: CreateBookPayload) => Promise<Book | string> }).create(data);
      
      // Emit success event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.SUCCESS, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { book: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.CREATE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof BookValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap update method with validation and hookey events
  async update(id: string, data: UpdateBookPayload): Promise<Book | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { ...data, id });
    
    // Emit start event (fire and forget)
    mobileHooks.emit(MOBILE_EVENTS.BOOK.UPDATE.START, eventMetadata);
    
    try {
      if (!hasUpdateFields(data)) {
        throw new BookValidationError(
          [{ field: 'data', code: 'NO_UPDATE_FIELDS', message: 'validation.book.update.noFields' }],
          'No fields provided for update'
        );
      }
      
      validateUpdateBookAndThrow(data);
      const result = await (this.handler as unknown as { update: (id: string, data: UpdateBookPayload) => Promise<Book | string> }).update(id, data);
      
      // Emit success event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.UPDATE.SUCCESS, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { book: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.UPDATE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof BookValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap delete method with validation and hookey events
  async delete(id: string): Promise<void> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { id });
    
    // Emit start event (fire and forget)
    mobileHooks.emit(MOBILE_EVENTS.BOOK.DELETE.START, eventMetadata);
    
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BookValidationError(
          [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.book.id.required' }],
          'Book ID is required for delete operation'
        );
      }
      
      await (this.handler as unknown as { delete: (id: string) => Promise<void> }).delete(id);
      
      // Emit success event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.DELETE.SUCCESS, eventMetadata);
    } catch (error) {
      // Emit failure event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.DELETE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof BookValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  async read?(id: string): Promise<Book> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { id });
    
    // Emit start event (fire and forget)
    mobileHooks.emit(MOBILE_EVENTS.BOOK.READ.START, eventMetadata);
    
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new BookValidationError(
          [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.book.id.required' }],
          'Book ID is required for read operation'
        );
      }
      
      const handler = this.handler as unknown as { read?: (id: string) => Promise<Book> };
      const result = await handler.read!(id);
      
      // Emit success event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.READ.SUCCESS, {
        ...eventMetadata,
        result: { book: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event (fire and forget)
      mobileHooks.emit(MOBILE_EVENTS.BOOK.READ.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof BookValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  async list?(filters?: Record<string, unknown>): Promise<Book[]> {
    const handler = this.handler as unknown as { list?: (filters?: Record<string, unknown>) => Promise<Book[]> };
    return handler.list!(filters);
  }
}

// Factory function to create book handlers
export class BookHandlerFactory {
  /**
   * Create Pure HTTP Book Handler (web-app pattern)
   * - Direct HTTP calls to API server
   * - Fails immediately when offline
   * - Used for real-time operations requiring server confirmation
   * - Includes validation for all operations
   */
  static createClientGateway(httpClient: HttpClient): ValidatedBookHandler<ClientGatewayHandler<Book>> {
    const config = createDefaultClientGatewayConfig(httpClient);
    const handler = createClientGateway<Book>('book', config);
    return new ValidatedBookHandler(handler);
  }

  /**
   * Create Auto-queueing Mobile Book Handler (hybrid)
   * - Attempts HTTP call when online
   * - Falls back to queue when offline or timeout
   * - Provides optimistic updates for better UX
   * - Includes validation for all operations
   */
  static createMobileHandler(httpClient: HttpClient, queue: ExecutableQueue, networkProvider: NetworkStateProvider): ValidatedBookHandler<MobileHandlerType<Book>> {
    const config = createDefaultMobileHandlerConfig(httpClient, queue, networkProvider);
    const handler = createMobileHandler<Book>('book', config);
    return new ValidatedBookHandler(handler);
  }

  /**
   * Create Queue-only Book Handler
   * - Always queues operations for background sync
   * - Used for bulk operations or guaranteed eventual consistency
   * - No network dependency
   * - Includes validation for all operations
   */
  static createQueueHandler(queue?: OperationQueue): ValidatedBookHandler<QueueHandlerType<Book>> {
    const config = createDefaultQueueHandlerConfig('book', queue);
    const handler = createQueueHandler<Book>('book', config);
    return new ValidatedBookHandler(handler);
  }
}

// Convenience exports for direct usage
export const bookClientGateway = {
  create: (httpClient: HttpClient) => BookHandlerFactory.createClientGateway(httpClient),
};

export const bookMobileHandler = {
  create: (httpClient: HttpClient, queue: ExecutableQueue, networkProvider: NetworkStateProvider) =>
    BookHandlerFactory.createMobileHandler(httpClient, queue, networkProvider),
};

export const bookQueueHandler = {
  create: (queue?: OperationQueue) => BookHandlerFactory.createQueueHandler(queue),
};

/**
 * Usage Examples:
 * 
 * // 1. Pure HTTP (fail-fast when offline)
 * const clientHandler = BookHandlerFactory.createClientGateway(httpClient);
 * const book = await clientHandler.create({ title: 'Book Title', author: 'Author', status: 'reading' });
 * 
 * // 2. Auto-queueing hybrid (mobile optimized)
 * const mobileHandler = BookHandlerFactory.createMobileHandler(httpClient, queue, networkProvider);
 * const book = await mobileHandler.create({ title: 'Book Title', author: 'Author', status: 'reading' });
 * 
 * // 3. Queue-only (no HTTP)
 * const queueHandler = BookHandlerFactory.createQueueHandler(queue);
 * const tempId = await queueHandler.create({ title: 'Book Title', author: 'Author', status: 'reading' });
 */