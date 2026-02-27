import { QueuedOperation, BookOperationPayload, AuthorOperationPayload, CategoryOperationPayload } from '../types/queue';
import type { BookFormData } from '@my-many-books/shared-types';
import { apiClient } from './api';
import { idMappingService } from './sync/IDMappingService';
import { bookRepository } from './database/BookRepository';
import { authorRepository } from './database/AuthorRepository';
import { categoryRepository } from './database/CategoryRepository';
import { cleanupService } from './sync/CleanupService';
import { ApiError } from '../types/errors';
import { OPERATION_TYPES, RESOURCE_TYPES } from './hooks/eventsSchema';
import { mobileHooks, MOBILE_EVENTS } from './hooks/mobileHooks';
import { SYNC_STATUS } from '@/types';

/**
 * Execute queued operation based on resource type and operation type
 */
export async function executeOperation(operation: QueuedOperation): Promise<void> {
  const { type, resource, payload } = operation;
  const startTime = Date.now();

  // Emit operation start event
  mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.OPERATION.START, {
    operationId: operation.id,
    type,
    resource,
    retryCount: operation.retryCount,
    timestamp: new Date().toISOString(),
    sessionId: `executor-${startTime}`
  });

  try {
    switch (resource) {
      case RESOURCE_TYPES.BOOK:
        await executeBookOperation(type, payload as BookOperationPayload);
        break;
      case RESOURCE_TYPES.AUTHOR:
        await executeAuthorOperation(type, payload as AuthorOperationPayload);
        break;
      case RESOURCE_TYPES.CATEGORY:
        await executeCategoryOperation(type, payload as CategoryOperationPayload);
        break;
      case RESOURCE_TYPES.USER:
        await executeUserOperation(type, payload);
        break;
      case 'settings':
        await executeSettingsOperation(type, payload);
        break;
      default:
        throw new Error(`Unknown resource type: ${resource}`);
    }

    const endTime = Date.now();
    const executionDuration = endTime - startTime;

    // Emit operation success event
    mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.OPERATION.SUCCESS, {
      operationId: operation.id,
      type,
      resource,
      retryCount: operation.retryCount,
      executionDuration,
      timestamp: new Date().toISOString(),
      sessionId: `executor-${startTime}`
    });

    // Emit performance metrics
    mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.PERFORMANCE_METRIC, {
      operationId: operation.id,
      type,
      resource,
      executionDuration,
      retryCount: operation.retryCount,
      timestamp: new Date().toISOString(),
      performanceData: {
        startTime,
        endTime,
        success: true
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const executionDuration = endTime - startTime;

    // Categorize error type
    const isNetworkError = isNetworkRelatedError(error);
    const isValidationError = isValidationRelatedError(error);

    // Emit appropriate error event
    if (isNetworkError) {
      mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.NETWORK_ERROR, {
        operationId: operation.id,
        type,
        resource,
        retryCount: operation.retryCount,
        error: error instanceof Error ? error.message : String(error),
        errorType: 'network',
        executionDuration,
        timestamp: new Date().toISOString(),
        sessionId: `executor-${startTime}`
      });
    } else if (isValidationError) {
      mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.VALIDATION_ERROR, {
        operationId: operation.id,
        type,
        resource,
        retryCount: operation.retryCount,
        error: error instanceof Error ? error.message : String(error),
        errorType: 'validation',
        executionDuration,
        timestamp: new Date().toISOString(),
        sessionId: `executor-${startTime}`
      });
    } else {
      // General operation failed event
      mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.OPERATION.FAILED, {
        operationId: operation.id,
        type,
        resource,
        retryCount: operation.retryCount,
        error: error instanceof Error ? error.message : String(error),
        errorType: 'unknown',
        executionDuration,
        timestamp: new Date().toISOString(),
        sessionId: `executor-${startTime}`
      });
    }

    // Emit performance metrics for failed operations too
    mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.PERFORMANCE_METRIC, {
      operationId: operation.id,
      type,
      resource,
      executionDuration,
      retryCount: operation.retryCount,
      timestamp: new Date().toISOString(),
      performanceData: {
        startTime,
        endTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    throw error;
  }
}

/**
 * Check if error is network-related
 */
function isNetworkRelatedError(error: unknown): boolean {
  if (!error) return false;
  
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Network') || 
         message.includes('timeout') || 
         message.includes('offline') ||
         message.includes('connection') ||
         message.includes('HTTP 5');
}

/**
 * Check if error is validation-related
 */
function isValidationRelatedError(error: unknown): boolean {
  if (!error) return false;
  
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('validation') || 
         message.includes('required') || 
         message.includes('invalid') ||
         message.includes('HTTP 4');
}

async function executeBookOperation(type: string, payload: BookOperationPayload): Promise<void> {
  switch (type) {
    case OPERATION_TYPES.CREATE:
      await executeCreateBook(payload);
      break;
    case OPERATION_TYPES.UPDATE:
      await executeUpdateBook(payload as BookOperationPayload & { id: string });
      break;
    case OPERATION_TYPES.DELETE:
      await executeDeleteBook(payload as { id: string });
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

/**
 * Execute CREATE book operation with ID mapping
 * Flow (Task 5.3.1):
 * 1. Resolve foreign keys in payload (convert temp IDs to server IDs if mapped)
 * 2. Send to server with _tempId field
 * 3. Server returns book with server-assigned id
 * 4. Register temp → server ID mapping
 * 5. Update local SQLite with server_id
 */
async function executeCreateBook(payload: BookOperationPayload): Promise<void> {
  const tempId = (payload as { id?: string }).id; // Store original temp ID

  // Resolve foreign keys before sending to server
  const resolvedPayload = await idMappingService.resolveForeignKeys(payload);

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  const serverResponse = await apiClient.books.createBook(resolvedPayload as BookFormData) as Record<string, unknown>;

  // Extract server-assigned ID from response
  const serverId = serverResponse.id as number;

  if (serverId && tempId) {
    // Register ID mapping
    await idMappingService.registerTempId(tempId, serverId, 'book');

    // Replace temp ID with server ID and mark as synced (Critical Fix)
    // This also handles foreign key updates in a transaction
    await bookRepository.replaceTempIdWithServerId(tempId, serverId);

    // Update server timestamp for consistency (Phase 5 fix)
    if (serverResponse.updateDate || serverResponse.updatedAt) {
      await bookRepository.updateSyncFields(serverId.toString(), {
        serverUpdatedAt: (serverResponse.updateDate || serverResponse.updatedAt) as string,
        syncStatus: SYNC_STATUS.SYNCED
      });
    }

    // Verify foreign key integrity (Task 5.5.2)
    await cleanupService.updateForeignKeysForBook(serverId.toString(), serverId);

    // Temp ID replaced with server ID successfully
  }
}

/**
 * Execute UPDATE book operation with ID mapping
 * Flow (Task 5.3.2):
 * 1. Use server_id if available, fallback to id
 * 2. Resolve foreign keys in payload
 * 3. Send to server
 */
async function executeUpdateBook(payload: BookOperationPayload & { id: string }): Promise<void> {
  const bookId = payload.id;

  // Get book from local DB - use mapping-aware lookup (Critical Fix)
  const localBook = await bookRepository.findByIdOrMapping(bookId);

  if (!localBook) {
    throw new Error(`Book not found in local DB: ${bookId}`);
  }

  // Use server_id if available, otherwise use the current book ID (which could be server ID after replacement)
  const serverIdToUse = localBook.serverId || localBook.entity.id;

  // Resolve foreign keys in payload
  const resolvedPayload = await idMappingService.resolveForeignKeys(payload);

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  const updateResponse = await apiClient.books.updateBook(Number(serverIdToUse), resolvedPayload) as Record<string, unknown>;

  // Update server timestamp for consistency (Phase 5 fix)
  if (updateResponse.updateDate || updateResponse.updatedAt) {
    await bookRepository.updateSyncFields(String(serverIdToUse), {
      serverUpdatedAt: (updateResponse.updateDate || updateResponse.updatedAt) as string,
      syncStatus: SYNC_STATUS.SYNCED
    });
  }
}

/**
 * Execute DELETE book operation with ID mapping
 * Flow (Task 5.3.2):
 * 1. Use server_id for server request
 * 2. Handle case where book never synced (server_id=NULL)
 */
async function executeDeleteBook(payload: { id: string }): Promise<void> {
  const bookId = payload.id;

  // Get book from local DB - use mapping-aware lookup (Critical Fix)
  const localBook = await bookRepository.findByIdOrMapping(bookId);

  if (!localBook) {
    // Book already deleted locally, just succeed
    // Book not found locally, assuming already deleted
    return;
  }

  // If book never synced to server (no server_id), no need to delete from server
  if (!localBook.serverId) {
    // Book never synced to server, skipping server delete
    return;
  }

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  await apiClient.books.deleteBook(localBook.serverId);
}

async function executeUserOperation(_type: string, _payload: unknown): Promise<void> {
  // User operations not yet implemented
  throw new Error('User operations not yet implemented');
}

async function executeAuthorOperation(type: string, payload: AuthorOperationPayload): Promise<void> {
  switch (type) {
    case OPERATION_TYPES.CREATE:
      await executeCreateAuthor(payload);
      break;
    case OPERATION_TYPES.UPDATE:
      await executeUpdateAuthor(payload as AuthorOperationPayload & { id: string });
      break;
    case OPERATION_TYPES.DELETE:
      await executeDeleteAuthor(payload as { id: string });
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function executeCategoryOperation(type: string, payload: CategoryOperationPayload): Promise<void> {
  switch (type) {
    case OPERATION_TYPES.CREATE:
      await executeCreateCategory(payload);
      break;
    case OPERATION_TYPES.UPDATE:
      await executeUpdateCategory(payload as CategoryOperationPayload & { id: string });
      break;
    case OPERATION_TYPES.DELETE:
      await executeDeleteCategory(payload as { id: string });
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function executeCreateAuthor(payload: AuthorOperationPayload): Promise<void> {
  const tempId = (payload as { id?: string }).id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
  const serverResponse = await apiClient.authors.createAuthor({
    name: payload.name,
    surname: payload.surname,
    nationality: payload.nationality,
  }) as Record<string, unknown>;

  const serverId = serverResponse.id as number;
  if (serverId && tempId) {
    await idMappingService.registerTempId(tempId, serverId, 'author');
    await authorRepository.updateSyncFields(Number(tempId), {
      serverId,
      serverUpdatedAt: (serverResponse.updateDate || new Date().toISOString()) as string,
      syncStatus: SYNC_STATUS.SYNCED,
    });
  }
}

async function executeUpdateAuthor(payload: AuthorOperationPayload & { id: string }): Promise<void> {
  const authorId = payload.id;
  const localAuthor = await authorRepository.findById(Number(authorId));
  if (!localAuthor) {
    throw new Error(`Author not found: ${authorId}`);
  }

  const serverIdToUse = localAuthor.serverId || localAuthor.entity.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
  const updateResponse = await apiClient.authors.updateAuthor(Number(serverIdToUse), {
    name: payload.name,
    surname: payload.surname,
    nationality: payload.nationality,
  }) as Record<string, unknown>;

  if (updateResponse.updateDate) {
    await authorRepository.updateSyncFields(Number(authorId), {
      serverUpdatedAt: updateResponse.updateDate as string,
      syncStatus: SYNC_STATUS.SYNCED,
    });
  }
}

async function executeDeleteAuthor(payload: { id: string }): Promise<void> {
  const authorId = payload.id;
  const localAuthor = await authorRepository.findById(Number(authorId));
  if (!localAuthor) return;

  if (localAuthor.serverId) {
    // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
    await apiClient.authors.deleteAuthor(localAuthor.serverId);
  }
}

async function executeCreateCategory(payload: CategoryOperationPayload): Promise<void> {
  const tempId = (payload as { id?: string }).id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
  const serverResponse = await apiClient.categories.createCategory({
    name: payload.name,
  }) as Record<string, unknown>;

  const serverId = serverResponse.id as number;
  if (serverId && tempId) {
    await idMappingService.registerTempId(tempId, serverId, 'category');
    await categoryRepository.updateSyncFields(Number(tempId), {
      serverId,
      serverUpdatedAt: (serverResponse.updateDate || new Date().toISOString()) as string,
      syncStatus: SYNC_STATUS.SYNCED,
    });
  }
}

async function executeUpdateCategory(payload: CategoryOperationPayload & { id: string }): Promise<void> {
  const categoryId = payload.id;
  const localCategory = await categoryRepository.findById(Number(categoryId));
  if (!localCategory) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  const serverIdToUse = localCategory.serverId || localCategory.entity.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
  const updateResponse = await apiClient.categories.updateCategory(Number(serverIdToUse), {
    name: payload.name,
  }) as Record<string, unknown>;

  if (updateResponse.updateDate) {
    await categoryRepository.updateSyncFields(Number(categoryId), {
      serverUpdatedAt: updateResponse.updateDate as string,
      syncStatus: SYNC_STATUS.SYNCED,
    });
  }
}

async function executeDeleteCategory(payload: { id: string }): Promise<void> {
  const categoryId = payload.id;
  const localCategory = await categoryRepository.findById(Number(categoryId));
  if (!localCategory) return;

  if (localCategory.serverId) {
    // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
    await apiClient.categories.deleteCategory(localCategory.serverId);
  }
}

async function executeSettingsOperation(_type: string, _payload: unknown): Promise<void> {
  throw new Error('Settings operations not yet implemented');
}

/**
 * Check if error is retriable and emit retry scheduling events
 * Now supports both structured ApiError and legacy Error checking
 */
export function isRetriableError(error: unknown, operationId?: string, currentRetryCount?: number, maxRetries?: number): boolean {
  // Handle null/undefined errors
  if (!error) {
    return false;
  }

  let isRetriable = false;
  let retryReason = '';

  // Structured ApiError - use built-in retriable property
  if (error instanceof ApiError) {
    isRetriable = error.retriable;
    retryReason = 'structured_api_error';
  } else {
    // Check if it's an object with retriable property (for test compatibility)
    if (typeof error === 'object' && error !== null && 'retriable' in error && 'code' in error) {
      isRetriable = Boolean(error.retriable);
      retryReason = 'structured_api_error';
    } else {
      // Legacy HTTP error fallback
      const message = error instanceof Error ? error.message : 
                     (typeof error === 'object' && error !== null && 'message' in error) ? 
                     String(error.message) : String(error);
      
      // HTTP status codes (if error object has status property)
      if (typeof error === 'object' && error !== null && 'status' in error && error.status) {
        const status = error.status as number;
        // 408 Request Timeout is retriable
        if (status === 408) {
          isRetriable = true;
          retryReason = 'timeout_408';
        }
        // 429 Too Many Requests is retriable
        else if (status === 429) {
          isRetriable = true;
          retryReason = 'rate_limit_429';
        }
        // 5xx server errors are retriable
        else if (status >= 500 && status <= 599) {
          isRetriable = true;
          retryReason = 'server_error_5xx';
        }
      }
      // HTTP error messages
      else if (message?.match(/HTTP 5\d\d:/)) {
        isRetriable = true;
        retryReason = 'server_error_message';
      }
      else if (message?.includes('HTTP 408:') || message?.includes('Request Timeout')) {
        isRetriable = true;
        retryReason = 'request_timeout_message';
      }
      else if (message?.includes('HTTP 429:')) {
        isRetriable = true;
        retryReason = 'rate_limit_message';
      }
      
      if (!isRetriable) {
        retryReason = 'non_retriable_legacy_error';
      }
    }
  }

  // Emit retry scheduling or max retries events if operation details provided
  if (operationId && currentRetryCount !== undefined && maxRetries !== undefined) {
    if (isRetriable && currentRetryCount < maxRetries) {
      // Calculate backoff delay
      const backoffDelay = Math.pow(2, currentRetryCount) * 1000; // 1s, 2s, 4s, 8s
      
      mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.RETRY_SCHEDULED, {
        operationId,
        retryCount: currentRetryCount,
        maxRetries,
        nextRetryIn: backoffDelay,
        retryReason,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        backoffStrategy: 'exponential'
      });
    } else if (currentRetryCount >= maxRetries) {
      mobileHooks.emit(MOBILE_EVENTS.EXECUTOR.MAX_RETRIES_REACHED, {
        operationId,
        retryCount: currentRetryCount,
        maxRetries,
        finalError: error instanceof Error ? error.message : String(error),
        retryReason,
        timestamp: new Date().toISOString(),
        abandoned: true
      });
    }
  }

  return isRetriable;
}
