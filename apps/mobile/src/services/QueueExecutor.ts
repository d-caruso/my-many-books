import { QueuedOperation } from '../types/queue';
import { bookAPI } from './api';
import { idMappingService } from './sync/IDMappingService';
import { bookRepository } from './database/BookRepository';
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

  // Send to server
  const serverResponse: any = await bookAPI.createBook(serverPayload);

  // Extract server-assigned ID from response
  const serverId = serverResponse.id;

  if (serverId && tempId) {
    // Register ID mapping
    await idMappingService.registerTempId(tempId, serverId, 'book');

    // Replace temp ID with server ID and mark as synced (Critical Fix)
    // This also handles foreign key updates in a transaction
    await bookRepository.replaceTempIdWithServerId(tempId, serverId);

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

  // Send to server using server ID
  await bookAPI.updateBook(String(serverIdToUse), resolvedPayload);
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

  // Send delete request using server_id
  await bookAPI.deleteBook(String(localBook.serverId));
}

async function executeUserOperation(type: string, payload: any): Promise<void> {
  // User operations not yet implemented
  throw new Error('User operations not yet implemented');
}

async function executeSettingsOperation(type: string, payload: any): Promise<void> {
  // Settings operations not yet implemented
  throw new Error('Settings operations not yet implemented');
}

/**
 * Check if error is retriable
 */
export function isRetriableError(error: any): boolean {
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

  // HTTP status codes
  if (error.status) {
    // 408 Request Timeout is retriable
    if (error.status === 408) {
      return true;
    }

    // 4xx validation errors are NOT retriable
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
