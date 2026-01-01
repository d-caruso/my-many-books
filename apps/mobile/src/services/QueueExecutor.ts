import { QueuedOperation } from '../types/queue';
import { apiClient } from './api';
import { idMappingService } from './sync/IDMappingService';
import { bookRepository } from './database/BookRepository';
import { authorRepository } from './database/AuthorRepository';
import { categoryRepository } from './database/CategoryRepository';
import { cleanupService } from './sync/CleanupService';

/**
 * Execute queued operation based on resource type and operation type
 */
export async function executeOperation(operation: QueuedOperation): Promise<void> {
  const { type, resource, payload } = operation;

  switch (resource) {
    case 'book':
      await executeBookOperation(type, payload);
      break;
    case 'author':
      await executeAuthorOperation(type, payload);
      break;
    case 'category':
      await executeCategoryOperation(type, payload);
      break;
    case 'user':
      await executeUserOperation(type, payload);
      break;
    case 'settings':
      await executeSettingsOperation(type, payload);
      break;
    default:
      throw new Error(`Unknown resource type: ${resource}`);
  }
}

async function executeBookOperation(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'CREATE':
      await executeCreateBook(payload);
      break;
    case 'UPDATE':
      await executeUpdateBook(payload);
      break;
    case 'DELETE':
      await executeDeleteBook(payload);
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
async function executeCreateBook(payload: any): Promise<void> {
  const tempId = payload.id; // Store original temp ID

  // Resolve foreign keys before sending to server
  const resolvedPayload = await idMappingService.resolveForeignKeys(payload);

  // Add _tempId field for server to know this is a mobile-created book
  const serverPayload = {
    ...resolvedPayload,
    _tempId: tempId,
  };

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  const serverResponse: any = await apiClient.books.createBook(serverPayload);

  // Extract server-assigned ID from response
  const serverId = serverResponse.id;

  if (serverId && tempId) {
    // Register ID mapping
    await idMappingService.registerTempId(tempId, serverId, 'book');

    // Replace temp ID with server ID and mark as synced (Critical Fix)
    // This also handles foreign key updates in a transaction
    await bookRepository.replaceTempIdWithServerId(tempId, serverId);

    // Update server timestamp for consistency (Phase 5 fix)
    if (serverResponse.updateDate || serverResponse.updatedAt) {
      await bookRepository.updateSyncFields(serverId.toString(), {
        _serverUpdatedAt: serverResponse.updateDate || serverResponse.updatedAt,
        _syncStatus: 'synced'
      });
    }

    // Verify foreign key integrity (Task 5.5.2) 
    await cleanupService.updateForeignKeysForBook(serverId.toString(), serverId);

    console.log(`Temp ID replaced with server ID: ${tempId} → ${serverId}`);
  }
}

/**
 * Execute UPDATE book operation with ID mapping
 * Flow (Task 5.3.2):
 * 1. Use server_id if available, fallback to id
 * 2. Resolve foreign keys in payload
 * 3. Send to server
 */
async function executeUpdateBook(payload: any): Promise<void> {
  const bookId = payload.id;

  // Get book from local DB - use mapping-aware lookup (Critical Fix)
  const localBook = await bookRepository.findByIdOrMapping(bookId);

  if (!localBook) {
    throw new Error(`Book not found in local DB: ${bookId}`);
  }

  // Use server_id if available, otherwise use the current book ID (which could be server ID after replacement)
  const serverIdToUse = localBook.serverId || localBook.id;

  // Resolve foreign keys in payload
  const resolvedPayload = await idMappingService.resolveForeignKeys(payload);

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  const updateResponse: any = await apiClient.books.updateBook(String(serverIdToUse), resolvedPayload);

  // Update server timestamp for consistency (Phase 5 fix)
  if (updateResponse.updateDate || updateResponse.updatedAt) {
    await bookRepository.updateSyncFields(bookId, {
      _serverUpdatedAt: updateResponse.updateDate || updateResponse.updatedAt,
      _syncStatus: 'synced'
    });
  }
}

/**
 * Execute DELETE book operation with ID mapping
 * Flow (Task 5.3.2):
 * 1. Use server_id for server request
 * 2. Handle case where book never synced (server_id=NULL)
 */
async function executeDeleteBook(payload: any): Promise<void> {
  const bookId = payload.id;

  // Get book from local DB - use mapping-aware lookup (Critical Fix)
  const localBook = await bookRepository.findByIdOrMapping(bookId);

  if (!localBook) {
    // Book already deleted locally, just succeed
    console.log(`Book ${bookId} not found locally, assuming already deleted`);
    return;
  }

  // If book never synced to server (no server_id), no need to delete from server
  if (!localBook.serverId) {
    console.log(`Book ${bookId} never synced to server, skipping server delete`);
    return;
  }

  // CRITICAL: Use raw apiClient to avoid double-queueing (bookAPI wraps withQueueOnError)
  await apiClient.books.deleteBook(String(localBook.serverId));
}

async function executeUserOperation(type: string, payload: any): Promise<void> {
  // User operations not yet implemented
  throw new Error('User operations not yet implemented');
}

async function executeAuthorOperation(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'CREATE':
      await executeCreateAuthor(payload);
      break;
    case 'UPDATE':
      await executeUpdateAuthor(payload);
      break;
    case 'DELETE':
      await executeDeleteAuthor(payload);
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function executeCategoryOperation(type: string, payload: any): Promise<void> {
  switch (type) {
    case 'CREATE':
      await executeCreateCategory(payload);
      break;
    case 'UPDATE':
      await executeUpdateCategory(payload);
      break;
    case 'DELETE':
      await executeDeleteCategory(payload);
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
}

async function executeCreateAuthor(payload: any): Promise<void> {
  const tempId = payload.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
  const serverResponse: any = await apiClient.authors.createAuthor({
    name: payload.name,
    surname: payload.surname,
    nationality: payload.nationality,
  });

  const serverId = serverResponse.id;
  if (serverId && tempId) {
    await idMappingService.registerTempId(tempId, serverId, 'author');
    await authorRepository.updateSyncFields(tempId, {
      serverId,
      _serverUpdatedAt: serverResponse.updateDate || new Date().toISOString(),
      _syncStatus: 'synced',
    });
  }
}

async function executeUpdateAuthor(payload: any): Promise<void> {
  const authorId = payload.id;
  const localAuthor = await authorRepository.findById(authorId);
  if (!localAuthor) {
    throw new Error(`Author not found: ${authorId}`);
  }

  const serverIdToUse = localAuthor.serverId || localAuthor.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
  const updateResponse: any = await apiClient.authors.updateAuthor(Number(serverIdToUse), {
    name: payload.name,
    surname: payload.surname,
    nationality: payload.nationality,
  });

  if (updateResponse.updateDate) {
    await authorRepository.updateSyncFields(authorId, {
      _serverUpdatedAt: updateResponse.updateDate,
      _syncStatus: 'synced',
    });
  }
}

async function executeDeleteAuthor(payload: any): Promise<void> {
  const authorId = payload.id;
  const localAuthor = await authorRepository.findById(authorId);
  if (!localAuthor) return;

  if (localAuthor.serverId) {
    // CRITICAL: Use raw apiClient to avoid double-queueing (authorAPI would wrap withQueueOnError)
    await apiClient.authors.deleteAuthor(localAuthor.serverId);
  }
}

async function executeCreateCategory(payload: any): Promise<void> {
  const tempId = payload.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
  const serverResponse: any = await apiClient.categories.createCategory({
    name: payload.name,
  });

  const serverId = serverResponse.id;
  if (serverId && tempId) {
    await idMappingService.registerTempId(tempId, serverId, 'category');
    await categoryRepository.updateSyncFields(tempId, {
      serverId,
      _serverUpdatedAt: serverResponse.updateDate || new Date().toISOString(),
      _syncStatus: 'synced',
    });
  }
}

async function executeUpdateCategory(payload: any): Promise<void> {
  const categoryId = payload.id;
  const localCategory = await categoryRepository.findById(categoryId);
  if (!localCategory) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  const serverIdToUse = localCategory.serverId || localCategory.id;
  // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
  const updateResponse: any = await apiClient.categories.updateCategory(Number(serverIdToUse), {
    name: payload.name,
  });

  if (updateResponse.updateDate) {
    await categoryRepository.updateSyncFields(categoryId, {
      _serverUpdatedAt: updateResponse.updateDate,
      _syncStatus: 'synced',
    });
  }
}

async function executeDeleteCategory(payload: any): Promise<void> {
  const categoryId = payload.id;
  const localCategory = await categoryRepository.findById(categoryId);
  if (!localCategory) return;

  if (localCategory.serverId) {
    // CRITICAL: Use raw apiClient to avoid double-queueing (categoryAPI would wrap withQueueOnError)
    await apiClient.categories.deleteCategory(localCategory.serverId);
  }
}

async function executeSettingsOperation(type: string, payload: any): Promise<void> {
  throw new Error('Settings operations not yet implemented');
}

/**
 * Check if error is retriable
 */
export function isRetriableError(error: any): boolean {
  // Handle null/undefined errors
  if (!error) {
    return false;
  }

  // Network errors are retriable
  if (error.message?.includes('Network request failed')) {
    return true;
  }

  // Timeout errors are retriable
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return true;
  }

  // Offline errors are retriable
  if (error.message?.includes('offline') || error.message?.includes('no connection')) {
    return true;
  }

  // FetchHttpClient throws plain Error with "HTTP 5xx" messages - check for server errors
  if (error.message?.match(/HTTP 5\d\d:/)) {
    return true;
  }

  // FetchHttpClient timeout errors
  if (error.message?.includes('HTTP 408:') || error.message?.includes('Request Timeout')) {
    return true;
  }

  // Rate limiting (429 Too Many Requests)
  if (error.message?.includes('HTTP 429:')) {
    return true;
  }

  // HTTP status codes (if error object has status property)
  if (error.status) {
    // 408 Request Timeout is retriable
    if (error.status === 408) {
      return true;
    }

    // 429 Too Many Requests is retriable
    if (error.status === 429) {
      return true;
    }

    // 4xx validation errors are NOT retriable (except 408 and 429)
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    // 5xx server errors ARE retriable
    if (error.status >= 500) {
      return true;
    }
  }

  // Default: not retriable
  return false;
}
