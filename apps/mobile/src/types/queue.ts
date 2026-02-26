import type { Book, Author, Category } from '@my-many-books/shared-types';
import type { OperationType, OperationStatus } from '../services/hooks/eventsSchema';
import { RESOURCE_TYPES } from '@my-many-books/shared-types';

export type { OperationType, OperationStatus };
export type ResourceType = 'book' | 'author' | 'category' | 'user' | 'settings';

// Base interface for all operation payloads
export interface BaseOperationPayload {
  id?: string | number;
  _tempId?: string;
}

// Specific payload types for each resource
export interface BookOperationPayload extends BaseOperationPayload {
  title?: string;
  isbnCode?: string;
  author?: string;
  status?: Book['status'];
  //TODO commented out fields that are not currently set in the API/DB but may be relevant for future features
  //thumbnail?: string;
  //description?: string;
  //publishedDate?: string;
  //pageCount?: number;
  //rating?: number;
  notes?: string;
  authorIds?: number[];
  categoryIds?: number[];
  editionNumber?: number;
  editionDate?: string;
}

export interface AuthorOperationPayload extends BaseOperationPayload {
  name?: string;
  surname?: string;
  nationality?: string;
}

export interface CategoryOperationPayload extends BaseOperationPayload {
  name?: string;
}

export interface UserOperationPayload extends BaseOperationPayload {
  email?: string;
  username?: string;
  preferences?: Record<string, unknown>;
}

export interface SettingsOperationPayload extends BaseOperationPayload {
  key?: string;
  value?: string | number | boolean | null;
  category?: string;
}

// Discriminated union for type-safe payloads
export type OperationPayload = 
  | { resource: 'book'; data: BookOperationPayload }
  | { resource: 'author'; data: AuthorOperationPayload }
  | { resource: 'category'; data: CategoryOperationPayload }
  | { resource: 'user'; data: UserOperationPayload }
  | { resource: 'settings'; data: SettingsOperationPayload };

// Updated QueuedOperation with discriminated union
export interface QueuedOperation {
  id: string;              // UUID
  type: OperationType;
  resource: ResourceType;
  payload: OperationPayload['data'];  // Type-safe payload based on resource
  timestamp: number;       // When queued
  retryCount: number;      // Attempts so far
  maxRetries: number;      // Max attempts (default: 3)
  status: OperationStatus;
  lastFailedAt?: number;   // Timestamp when last marked as FAILED
  crossSessionRetries?: number; // Cross-session retry attempts (default: 0)
}

// Typed operations for each resource
export interface BookQueuedOperation extends Omit<QueuedOperation, 'resource' | 'payload'> {
  resource: 'book';
  payload: BookOperationPayload;
}

export interface AuthorQueuedOperation extends Omit<QueuedOperation, 'resource' | 'payload'> {
  resource: 'author';
  payload: AuthorOperationPayload;
}

export interface CategoryQueuedOperation extends Omit<QueuedOperation, 'resource' | 'payload'> {
  resource: 'category';
  payload: CategoryOperationPayload;
}

export interface UserQueuedOperation extends Omit<QueuedOperation, 'resource' | 'payload'> {
  resource: 'user';
  payload: UserOperationPayload;
}

export interface SettingsQueuedOperation extends Omit<QueuedOperation, 'resource' | 'payload'> {
  resource: 'settings';
  payload: SettingsOperationPayload;
}

// Union of all typed operations
export type TypedQueuedOperation = 
  | BookQueuedOperation
  | AuthorQueuedOperation  
  | CategoryQueuedOperation
  | UserQueuedOperation
  | SettingsQueuedOperation;
