/**
 * Author Handler Variants with Hookey Integration
 * 
 * Three handler patterns for different use cases:
 * - authorClientGateway: Pure HTTP (web-app pattern, fail-fast when offline)
 * - authorMobileHandler: Auto-queueing hybrid (try online first, queue when offline)
 * - authorQueueHandler: Queue-only (no HTTP, prevents double-queueing)
 * 
 * All handlers emit hookey events for observability and tracking.
 */

import { createClientGateway, createDefaultClientGatewayConfig } from './gateways/clientGateway';
import { createMobileHandler, createDefaultMobileHandlerConfig } from './gateways/mobileHandler';
import { createQueueHandler, createDefaultQueueHandlerConfig } from './gateways/queueHandler';
import { ClientGatewayHandler, MobileHandlerType, QueueHandlerType } from './types/HandlerTypes';
import { mobileHooks, MOBILE_EVENTS } from '../hooks/mobileHooks';

// Author type definition (will be replaced with shared types in Phase 2)
export interface Author {
  id: string;
  name: string;
  bio?: string;
  birthYear?: number;
  nationality?: string;
  creationDate: string;
  updateDate: string;
}

export interface CreateAuthorPayload {
  name: string;
  bio?: string;
  birthYear?: number;
  nationality?: string;
}

export interface UpdateAuthorPayload {
  name?: string;
  bio?: string;
  birthYear?: number;
  nationality?: string;
}

// Simple validation for authors
class AuthorValidationError extends Error {
  constructor(public errors: Array<{ field: string; code: string; message: string }>, message: string) {
    super(message);
    this.name = 'AuthorValidationError';
  }
}

const validateCreateAuthor = (data: CreateAuthorPayload): void => {
  const errors: Array<{ field: string; code: string; message: string }> = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push({ field: 'name', code: 'NAME_REQUIRED', message: 'validation.author.name.required' });
  }
  
  if (data.name && data.name.length > 100) {
    errors.push({ field: 'name', code: 'NAME_TOO_LONG', message: 'validation.author.name.maxLength' });
  }
  
  if (errors.length > 0) {
    throw new AuthorValidationError(errors, 'Author validation failed');
  }
};

const validateUpdateAuthor = (data: UpdateAuthorPayload): void => {
  const errors: Array<{ field: string; code: string; message: string }> = [];
  
  if (data.name !== undefined && (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push({ field: 'name', code: 'NAME_REQUIRED', message: 'validation.author.name.required' });
  }
  
  if (data.name && data.name.length > 100) {
    errors.push({ field: 'name', code: 'NAME_TOO_LONG', message: 'validation.author.name.maxLength' });
  }
  
  if (errors.length > 0) {
    throw new AuthorValidationError(errors, 'Author validation failed');
  }
};

const hasUpdateFields = (data: UpdateAuthorPayload): boolean => {
  return Object.keys(data).length > 0;
};

// Helper function to generate unique operation IDs
const generateOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create event metadata
const createEventMetadata = (operationId: string, authorData?: Partial<Author | CreateAuthorPayload | UpdateAuthorPayload>) => ({
  operationId,
  resourceType: 'author' as const,
  timestamp: new Date().toISOString(),
  metadata: authorData ? {
    authorId: 'id' in authorData ? authorData.id : undefined,
    name: authorData.name,
    bio: authorData.bio,
    nationality: authorData.nationality,
  } : undefined,
});

// Validated author handler wrappers with hookey integration
class ValidatedAuthorHandler<THandler extends Record<string, unknown>> {
  constructor(private handler: THandler) {}

  // Wrap create method with validation and hookey events
  async create(data: CreateAuthorPayload): Promise<Author | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, data);
    
    // Emit start event
    await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.CREATE.START, eventMetadata);
    
    try {
      validateCreateAuthor(data);
      const result = await (this.handler as unknown as { create: (data: CreateAuthorPayload) => Promise<Author | string> }).create(data);
      
      // Emit success event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.CREATE.SUCCESS, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { author: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.CREATE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof AuthorValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap update method with validation and hookey events
  async update(id: string, data: UpdateAuthorPayload): Promise<Author | string> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { ...data, id });
    
    // Emit start event
    await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.START, eventMetadata);
    
    try {
      if (!hasUpdateFields(data)) {
        throw new AuthorValidationError(
          [{ field: 'data', code: 'NO_UPDATE_FIELDS', message: 'validation.author.update.noFields' }],
          'No fields provided for update'
        );
      }
      
      validateUpdateAuthor(data);
      const result = await (this.handler as unknown as { update: (id: string, data: UpdateAuthorPayload) => Promise<Author | string> }).update(id, data);
      
      // Emit success event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.SUCCESS, {
        ...eventMetadata,
        result: typeof result === 'string' ? { tempId: result } : { author: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.UPDATE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof AuthorValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  // Wrap delete method with validation and hookey events
  async delete(id: string): Promise<void> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { id });
    
    // Emit start event
    await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.DELETE.START, eventMetadata);
    
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new AuthorValidationError(
          [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.author.id.required' }],
          'Author ID is required for delete operation'
        );
      }
      
      await (this.handler as unknown as { delete: (id: string) => Promise<void> }).delete(id);
      
      // Emit success event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.DELETE.SUCCESS, eventMetadata);
    } catch (error) {
      // Emit failure event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.DELETE.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof AuthorValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  async read?(id: string): Promise<Author> {
    const operationId = generateOperationId();
    const eventMetadata = createEventMetadata(operationId, { id });
    
    // Emit start event
    await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.READ.START, eventMetadata);
    
    try {
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        throw new AuthorValidationError(
          [{ field: 'id', code: 'ID_REQUIRED', message: 'validation.author.id.required' }],
          'Author ID is required for read operation'
        );
      }
      
      const handler = this.handler as unknown as { read?: (id: string) => Promise<Author> };
      const result = await handler.read!(id);
      
      // Emit success event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.READ.SUCCESS, {
        ...eventMetadata,
        result: { author: result },
      });
      
      return result;
    } catch (error) {
      // Emit failure event
      await mobileHooks.emit(MOBILE_EVENTS.AUTHOR.READ.FAILED, {
        ...eventMetadata,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof AuthorValidationError ? 'validation' : 'unknown',
      });
      
      throw error;
    }
  }

  async list?(filters?: Record<string, unknown>): Promise<Author[]> {
    const handler = this.handler as unknown as { list?: (filters?: Record<string, unknown>) => Promise<Author[]> };
    return handler.list!(filters);
  }
}

// Factory function to create author handlers
export class AuthorHandlerFactory {
  /**
   * Create Pure HTTP Author Handler (web-app pattern)
   */
  static createClientGateway(httpClient: Record<string, unknown>): ValidatedAuthorHandler<ClientGatewayHandler<Author>> {
    const config = createDefaultClientGatewayConfig(httpClient);
    const handler = createClientGateway<Author>('author', config);
    return new ValidatedAuthorHandler(handler);
  }

  /**
   * Create Auto-queueing Mobile Author Handler (hybrid)
   */
  static createMobileHandler(httpClient: Record<string, unknown>, queue: Record<string, unknown>, networkProvider: Record<string, unknown>): ValidatedAuthorHandler<MobileHandlerType<Author>> {
    const config = createDefaultMobileHandlerConfig(httpClient, queue, networkProvider);
    const handler = createMobileHandler<Author>('author', config);
    return new ValidatedAuthorHandler(handler);
  }

  /**
   * Create Queue-only Author Handler
   */
  static createQueueHandler(queue: Record<string, unknown>): ValidatedAuthorHandler<QueueHandlerType<Author>> {
    const config = createDefaultQueueHandlerConfig('author', queue);
    const handler = createQueueHandler<Author>('author', config);
    return new ValidatedAuthorHandler(handler);
  }
}

// Convenience exports for direct usage
export const authorClientGateway = {
  create: (httpClient: Record<string, unknown>) => AuthorHandlerFactory.createClientGateway(httpClient),
};

export const authorMobileHandler = {
  create: (httpClient: Record<string, unknown>, queue: Record<string, unknown>, networkProvider: Record<string, unknown>) => 
    AuthorHandlerFactory.createMobileHandler(httpClient, queue, networkProvider),
};

export const authorQueueHandler = {
  create: (queue: Record<string, unknown>) => AuthorHandlerFactory.createQueueHandler(queue),
};