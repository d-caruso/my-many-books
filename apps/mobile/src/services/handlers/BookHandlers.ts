/**
 * Book Handler Variants
 * 
 * Three handler patterns for different use cases:
 * - bookClientGateway: Pure HTTP (web-app pattern, fail-fast when offline)
 * - bookMobileHandler: Auto-queueing hybrid (try online first, queue when offline)
 * - bookQueueHandler: Queue-only (no HTTP, prevents double-queueing)
 */

import { createClientGateway, createDefaultClientGatewayConfig } from './gateways/clientGateway';
import { createMobileHandler, createDefaultMobileHandlerConfig } from './gateways/mobileHandler';
import { createQueueHandler, createDefaultQueueHandlerConfig } from './gateways/queueHandler';
import { ClientGatewayHandler, MobileHandlerType, QueueHandlerType } from './types/HandlerTypes';
import { 
  validateCreateBookAndThrow, 
  validateUpdateBookAndThrow, 
  hasUpdateFields,
  BookValidationError 
} from './validation/BookValidation';

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

// Validated book handler wrappers
class ValidatedBookHandler<THandler extends Record<string, unknown>> {
  constructor(private handler: THandler) {}

  // Wrap create method with validation
  async create(data: CreateBookPayload): Promise<Book | string> {
    validateCreateBookAndThrow(data);
    return (this.handler as unknown as { create: (data: CreateBookPayload) => Promise<Book | string> }).create(data);
  }

  // Wrap update method with validation
  async update(id: string, data: UpdateBookPayload): Promise<Book | string> {
    if (!hasUpdateFields(data)) {
      throw new BookValidationError(
        [{ field: 'data', code: 'NO_UPDATE_FIELDS', message: 'validation.book.update.noFields' }],
        'No fields provided for update'
      );
    }
    validateUpdateBookAndThrow(data);
    return (this.handler as unknown as { update: (id: string, data: UpdateBookPayload) => Promise<Book | string> }).update(id, data);
  }

  // Pass through other methods without validation
  async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new BookValidationError(
        [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.book.id.required' }],
        'Book ID is required for delete operation'
      );
    }
    return (this.handler as unknown as { delete: (id: string) => Promise<void> }).delete(id);
  }

  async read?(id: string): Promise<Book> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new BookValidationError(
        [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.book.id.required' }],
        'Book ID is required for read operation'
      );
    }
    const handler = this.handler as unknown as { read?: (id: string) => Promise<Book> };
    return handler.read!(id);
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
  static createClientGateway(httpClient: Record<string, unknown>): ValidatedBookHandler<ClientGatewayHandler<Book>> {
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
  static createMobileHandler(httpClient: Record<string, unknown>, queue: Record<string, unknown>, networkProvider: Record<string, unknown>): ValidatedBookHandler<MobileHandlerType<Book>> {
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
  static createQueueHandler(queue: Record<string, unknown>): ValidatedBookHandler<QueueHandlerType<Book>> {
    const config = createDefaultQueueHandlerConfig('book', queue);
    const handler = createQueueHandler<Book>('book', config);
    return new ValidatedBookHandler(handler);
  }
}

// Convenience exports for direct usage
export const bookClientGateway = {
  create: (httpClient: Record<string, unknown>) => BookHandlerFactory.createClientGateway(httpClient),
};

export const bookMobileHandler = {
  create: (httpClient: Record<string, unknown>, queue: Record<string, unknown>, networkProvider: Record<string, unknown>) => 
    BookHandlerFactory.createMobileHandler(httpClient, queue, networkProvider),
};

export const bookQueueHandler = {
  create: (queue: Record<string, unknown>) => BookHandlerFactory.createQueueHandler(queue),
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