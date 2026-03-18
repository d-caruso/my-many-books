/**
 * ============================================================================
 * IMPORTANT: These handlers are NOT currently integrated into the app.
 * ============================================================================
 *
 * The app uses direct API calls for category operations. These handler factories
 * provide an alternative OOP approach with offline queueing support.
 *
 * Status: Fully implemented, NOT integrated (dead code)
 *
 * See docs/ARCHITECTURE_OVERVIEW.md for comparison table and details.
 * ============================================================================
 *
 * Category Handler Variants with Hookey Integration
 *
 * Three handler patterns for different use cases:
 * - categoryClientGateway: Pure HTTP (web-app pattern, fail-fast when offline)
 * - categoryMobileHandler: Auto-queueing hybrid (try online first, queue when offline)
 * - categoryQueueHandler: Queue-only (no HTTP, prevents double-queueing)
 *
 * All handlers emit hookey events for observability and tracking.
 */

import { createClientGateway, createDefaultClientGatewayConfig, HttpClient } from './gateways/clientGateway';
import { createMobileHandler, createDefaultMobileHandlerConfig, ExecutableQueue, NetworkStateProvider } from './gateways/mobileHandler';
import { createQueueHandler, createDefaultQueueHandlerConfig, OperationQueue } from './gateways/queueHandler';
import { ClientGatewayHandler, MobileHandlerType, QueueHandlerType } from './types/HandlerTypes';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

// Category type definition (will be replaced with shared types in Phase 2)
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  creationDate: string;
  updateDate: string;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  color?: string;
}

// Simple validation for categories
class CategoryValidationError extends Error {
  constructor(public errors: { field: string; code: string; message: string }[], message: string) {
    super(message);
    this.name = 'CategoryValidationError';
  }
}

const validateCreateCategory = (data: CreateCategoryPayload): void => {
  const errors: { field: string; code: string; message: string }[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', code: 'NAME_REQUIRED', message: 'validation.category.name.required' });
  }
  
  if (data.name && data.name.length > 50) {
    errors.push({ field: 'name', code: 'NAME_TOO_LONG', message: 'validation.category.name.maxLength' });
  }
  
  if (errors.length > 0) {
    throw new CategoryValidationError(errors, 'Category validation failed');
  }
};

const validateUpdateCategory = (data: UpdateCategoryPayload): void => {
  const errors: { field: string; code: string; message: string }[] = [];
  
  if (data.name !== undefined && (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push({ field: 'name', code: 'NAME_REQUIRED', message: 'validation.category.name.required' });
  }
  
  if (data.name && data.name.length > 50) {
    errors.push({ field: 'name', code: 'NAME_TOO_LONG', message: 'validation.category.name.maxLength' });
  }
  
  if (errors.length > 0) {
    throw new CategoryValidationError(errors, 'Category validation failed');
  }
};

const hasUpdateFields = (data: UpdateCategoryPayload): boolean => {
  return Object.keys(data).length > 0;
};

// Helper function to generate unique operation IDs
const generateOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create event metadata
const createEventMetadata = (operationId: string, categoryData?: Partial<Category | CreateCategoryPayload | UpdateCategoryPayload>) => ({
  operationId,
  resourceType: 'category' as const,
  timestamp: new Date().toISOString(),
  metadata: categoryData ? {
    categoryId: 'id' in categoryData ? categoryData.id : undefined,
    name: categoryData.name,
    description: categoryData.description,
    color: categoryData.color,
  } : undefined,
});

// Validated category handler wrappers with hookey integration
class ValidatedCategoryHandler<THandler extends object> {
  constructor(private handler: THandler) {}

  // Wrap create method with validation and hookey events
  async create(data: CreateCategoryPayload): Promise<Category | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, data);
    
    // Emit before event
    mobileHooks.emit(MOBILE_EVENTS.CATEGORY.CREATE.BEFORE, eventMetadata);
    
    try {
      validateCreateCategory(data);
      const result = await (this.handler as unknown as { create: (data: CreateCategoryPayload) => Promise<Category | string> }).create(data);
      
      // Emit after event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.CREATE.AFTER, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { category: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.CREATE.FAILURE, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof CategoryValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap update method with validation and hookey events
  async update(id: string, data: UpdateCategoryPayload): Promise<Category | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { ...data, id });
    
    // Emit before event
    mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.BEFORE, eventMetadata);
    
    try {
      if (!hasUpdateFields(data)) {
        throw new CategoryValidationError(
          [{ field: 'data', code: 'NO_UPDATE_FIELDS', message: 'validation.category.update.noFields' }],
          'No fields provided for update'
        );
      }
      
      validateUpdateCategory(data);
      const result = await (this.handler as unknown as { update: (id: string, data: UpdateCategoryPayload) => Promise<Category | string> }).update(id, data);
      
      // Emit after event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.AFTER, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { category: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.UPDATE.FAILURE, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof CategoryValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap delete method with validation and hookey events
  async delete(id: string): Promise<void> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { id });
    
    // Emit before event
    mobileHooks.emit(MOBILE_EVENTS.CATEGORY.DELETE.BEFORE, eventMetadata);
    
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new CategoryValidationError(
          [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.category.id.required' }],
          'Category ID is required for delete operation'
        );
      }
      
      await (this.handler as unknown as { delete: (id: string) => Promise<void> }).delete(id);
      
      // Emit after event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.DELETE.AFTER, eventMetadata);
    } catch (error) {
      // Emit failure event
      mobileHooks.emit(MOBILE_EVENTS.CATEGORY.DELETE.FAILURE, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof CategoryValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  async list?(filters?: Record<string, unknown>): Promise<Category[]> {
    const handler = this.handler as unknown as { list?: (filters?: Record<string, unknown>) => Promise<Category[]> };
    return handler.list!(filters);
  }
}

// Factory function to create category handlers
export class CategoryHandlerFactory {
  /**
   * Create Pure HTTP Category Handler (web-app pattern)
   */
  static createClientGateway(httpClient: HttpClient): ValidatedCategoryHandler<ClientGatewayHandler<Category>> {
    const config = createDefaultClientGatewayConfig(httpClient);
    const handler = createClientGateway<Category>('category', config);
    return new ValidatedCategoryHandler(handler);
  }

  /**
   * Create Auto-queueing Mobile Category Handler (hybrid)
   */
  static createMobileHandler(httpClient: HttpClient, queue: ExecutableQueue, networkProvider: NetworkStateProvider): ValidatedCategoryHandler<MobileHandlerType<Category>> {
    const config = createDefaultMobileHandlerConfig(httpClient, queue, networkProvider);
    const handler = createMobileHandler<Category>('category', config);
    return new ValidatedCategoryHandler(handler);
  }

  /**
   * Create Queue-only Category Handler
   */
  static createQueueHandler(queue: OperationQueue): ValidatedCategoryHandler<QueueHandlerType<Category>> {
    const config = createDefaultQueueHandlerConfig('category', queue);
    const handler = createQueueHandler<Category>('category', config);
    return new ValidatedCategoryHandler(handler);
  }
}

// Convenience exports for direct usage
export const categoryClientGateway = {
  create: (httpClient: HttpClient) => CategoryHandlerFactory.createClientGateway(httpClient),
};

export const categoryMobileHandler = {
  create: (httpClient: HttpClient, queue: ExecutableQueue, networkProvider: NetworkStateProvider) =>
    CategoryHandlerFactory.createMobileHandler(httpClient, queue, networkProvider),
};

export const categoryQueueHandler = {
  create: (queue: OperationQueue) => CategoryHandlerFactory.createQueueHandler(queue),
};
