import { QueuedOperation } from '../types/queue';
import { bookAPI } from './api';

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
      await bookAPI.createBook(payload);
      break;
    case 'UPDATE':
      await bookAPI.updateBook(payload.id, payload);
      break;
    case 'DELETE':
      await bookAPI.deleteBook(payload.id);
      break;
    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
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
    // 4xx validation errors are NOT retriable (except 408 timeout)
    if (error.status >= 400 && error.status < 500 && error.status !== 408) {
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
