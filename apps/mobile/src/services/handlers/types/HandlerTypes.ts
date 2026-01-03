/**
 * Handler Types for Mobile Simple Handlers Pattern
 * 
 * Three handler variants for clean separation of concerns:
 * - ClientGateway: Pure HTTP calls (web-app pattern)
 * - MobileHandler: Auto-queuing when offline
 * - QueueHandler: Queue-only (no HTTP, no double-queueing)
 */

import { OperationType } from '../../../types/queue';

/**
 * Pure HTTP handler - no queue, fails when offline
 * Same pattern as web-app handlers
 */
export type ClientGateway<T> = (data: T) => Promise<T>;

/**
 * Auto-queue when offline handler
 * Try HTTP first when online, automatically queue when offline
 * Returns optimistic response for UI
 */
export type MobileHandler<T> = (data: T) => Promise<T>;

/**
 * Queue-only handler - no HTTP calls
 * Prevents double-queueing when processing queue
 * Returns temp ID for tracking
 */
export type QueueHandler<T> = (data: T) => Promise<string>;

/**
 * Standard CRUD operations interface
 * Used as base for all resource handlers
 */
export interface CrudOperations<T> {
  create(data: CreatePayload<T>): Promise<T>;
  read(id: string): Promise<T>;
  update(id: string, data: UpdatePayload<T>): Promise<T>;
  delete(id: string): Promise<void>;
  list(filters?: FilterOptions<T>): Promise<T[]>;
}

/**
 * Gateway variants for different use cases
 */
export interface GatewayVariants<T> {
  /** Pure HTTP calls (web-app pattern) */
  clientGateway: ClientGatewayHandler<T>;
  /** Auto-queuing when offline */
  mobileHandler: MobileHandlerType<T>;
  /** Queue-only (no HTTP) */
  queueHandler: QueueHandlerType<T>;
}

/**
 * Client Gateway Handler - Pure HTTP
 * Fails immediately when offline (no queue)
 */
export interface ClientGatewayHandler<T> {
  create(data: CreatePayload<T>): Promise<T>;
  update(id: string, data: UpdatePayload<T>): Promise<T>;
  delete(id: string): Promise<void>;
  read?(id: string): Promise<T>;
  list?(filters?: FilterOptions<T>): Promise<T[]>;
}

/**
 * Mobile Handler - Auto-queueing
 * Try HTTP first when online, queue when offline
 */
export interface MobileHandlerType<T> {
  create(data: CreatePayload<T>): Promise<T>;
  update(id: string, data: UpdatePayload<T>): Promise<T>;
  delete(id: string): Promise<void>;
  read?(id: string): Promise<T>;
  list?(filters?: FilterOptions<T>): Promise<T[]>;
}

/**
 * Queue Handler - Queue-only
 * No HTTP calls, returns temp ID
 */
export interface QueueHandlerType<T> {
  create(data: CreatePayload<T>): Promise<string>;
  update(id: string, data: UpdatePayload<T>): Promise<string>;
  delete(id: string): Promise<string>;
}

/**
 * Handler configuration for different strategies
 */
export interface HandlerConfig {
  /** Resource type (book, author, category) */
  resourceType: string;
  /** Handler strategy */
  strategy: HandlerStrategy;
  /** Network timeout in ms */
  timeout?: number;
  /** Retry attempts for network calls */
  retryAttempts?: number;
  /** Enable optimistic updates */
  optimisticUpdates?: boolean;
}

/**
 * Handler strategy types
 */
export type HandlerStrategy = 'client-gateway' | 'mobile-handler' | 'queue-handler';

/**
 * Generic payload types
 */
export type CreatePayload<T> = Omit<T, 'id' | 'creationDate' | 'updateDate'>;
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'creationDate' | 'updateDate'>>;
export type FilterOptions<T> = Partial<T> & {
  search?: string;
  sortBy?: keyof T;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

/**
 * Handler operation context
 * Passed to handlers for operation metadata
 */
export interface HandlerContext {
  /** Operation ID for tracking */
  operationId: string;
  /** Operation type */
  operationType: OperationType;
  /** Resource type */
  resourceType: string;
  /** Network state at time of operation */
  isOnline: boolean;
  /** Timestamp */
  timestamp: Date;
  /** User ID */
  userId?: string;
}

/**
 * Handler response metadata
 * Returned with handler results
 */
export interface HandlerResponse<T> {
  /** Result data */
  data: T;
  /** Operation metadata */
  metadata: {
    /** Was operation queued? */
    queued: boolean;
    /** Temporary ID if queued */
    tempId?: string;
    /** Server response if immediate */
    serverResponse?: boolean;
    /** Handler strategy used */
    strategy: HandlerStrategy;
    /** Operation timestamp */
    timestamp: Date;
  };
}

/**
 * Handler error with context
 */
export interface HandlerError extends Error {
  /** Error code */
  code: string;
  /** Handler context */
  context: HandlerContext;
  /** Original error if any */
  originalError?: Error;
  /** Retry information */
  retryable?: boolean;
}

/**
 * Network state interface
 * For integration with existing network detection
 */
export interface NetworkState {
  isConnected: boolean;
  connectionType?: string;
  isInternetReachable?: boolean;
}