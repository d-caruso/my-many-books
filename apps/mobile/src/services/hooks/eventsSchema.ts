import { buildTreeSchema, EventName } from '@my-many-books/shared-utils';

// ================================================================
// REUSABLE EVENT PATTERNS
// ================================================================
// These patterns ensure consistency across all entities and enable
// easy extensibility without duplication.

/**
 * Base operation states used by all CRUD and sync operations
 * 
 * Usage examples:
 * - New operation state? Add to OPERATION_STATES once (affects all operations)
 * - Custom timing? Add TIMEOUT: null here
 */
const OPERATION_STATES = {
  START: null,
  SUCCESS: null,
  FAILED: null,
} as const;

/**
 * Sync-specific operations for all entities
 * 
 * All entities automatically inherit these sync capabilities:
 * - PULL: Download data from server 
 * - CONFLICT: Handle data conflicts during sync
 * - MERGE: Merge server data with local data
 */
const SYNC_OPERATIONS = {
  PULL: OPERATION_STATES,
  CONFLICT: {
    DETECTED: null,
    RESOLVED: null,
  },
  MERGE: OPERATION_STATES,
} as const;

/**
 * Complete entity operation pattern
 * 
 * All entities inherit this exact structure for perfect consistency:
 * - Standard CRUD operations (CREATE, READ, UPDATE, DELETE)
 * - Sync operations for offline/online data management
 * 
 * Extensibility examples:
 * - New entity? Just add: USER: ENTITY_OPERATIONS
 * - Custom entity? Use: ADMIN: { ...ENTITY_OPERATIONS, SPECIAL: { AUDIT: OPERATION_STATES } }
 * - All entities get new features automatically when patterns are extended
 */
const ENTITY_OPERATIONS = {
  CREATE: OPERATION_STATES,
  READ: OPERATION_STATES,
  UPDATE: OPERATION_STATES,
  DELETE: OPERATION_STATES,
  SYNC: SYNC_OPERATIONS,
} as const;

// ================================================================
// EVENT SCHEMA DEFINITION
// ================================================================

const schema = {
  // ================================================================
  // ENTITY EVENTS (Business Domain Objects)
  // ================================================================
  // All entities use the same operation pattern for perfect consistency.
  // This guarantees that every entity supports the same CRUD + Sync operations.
  
  /**
   * Book entity events
   * Supports: CREATE, READ, UPDATE, DELETE + SYNC operations
   * 
   * Example events generated:
   * - MOBILE_EVENTS.BOOK.CREATE.START ("book.create.start")
   * - MOBILE_EVENTS.BOOK.SYNC.PULL.SUCCESS ("book.sync.pull.success")
   * - MOBILE_EVENTS.BOOK.SYNC.CONFLICT.DETECTED ("book.sync.conflict.detected")
   */
  BOOK: ENTITY_OPERATIONS,
  
  /**
   * Author entity events
   * Inherits all standard entity operations automatically
   */
  AUTHOR: ENTITY_OPERATIONS,
  
  /**
   * Category entity events  
   * Inherits all standard entity operations automatically
   */
  CATEGORY: ENTITY_OPERATIONS,

  // Queue Events
  QUEUE: {
    ENQUEUE: null,
    DEQUEUE: null,
    PROCESS: {
      START: null,
      COMPLETE: null,
    },
    RETRY: null,
    FAILED: null,
    CLEARED: null,
    SIZE_CHANGED: null,
  },
  // Executor Events  
  EXECUTOR: {
    OPERATION: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    RETRY_SCHEDULED: null,
    MAX_RETRIES_REACHED: null,
    NETWORK_ERROR: null,
    VALIDATION_ERROR: null,
    PERFORMANCE_METRIC: null,
  },
  // Sync Events
  SYNC: {
    START: null,
    UPLOAD: {
      START: null,
      COMPLETE: null,
    },
    DOWNLOAD: {
      START: null,
      COMPLETE: null,
    },
    CONFLICT: {
      DETECTED: null,
      RESOLVED: null,
    },
    ID_MAPPING: {
      START: null,
      COMPLETE: null,
    },
    VALIDATION_FAILED: null,
    COMPLETE: null,
    FAILED: null,
    CLEANUP: {
      COMPLETE: null,  // Emitted when sync cleanup operations finish
    },
  },
  // Network Events
  NETWORK: {
    ONLINE: null,
    OFFLINE: null,
    TYPE_CHANGED: null,
    QUALITY_CHANGED: null,
    REACHABLE: null,
    UNREACHABLE: null,
    TIMEOUT: null,
    RESTORED: null,
    MONITORING_START: null,
    MONITORING_STOP: null,
  },
  // App Lifecycle Events
  APP: {
    STARTUP: null,
    INITIALIZATION: {
      START: null,
      COMPLETE: null,
    },
    FOREGROUND: null,
    BACKGROUND: null,
    ACTIVE: null,
    INACTIVE: null,
    TERMINATION: null,
    MEMORY_WARNING: null,
    SESSION: {
      START: null,
      END: null,
    },
  },
  // Error Events
  ERROR: {
    UNHANDLED: null,
    PROMISE_REJECTION: null,
    REACT_NATIVE: null,
    NETWORK_TIMEOUT: null,
    API_RESPONSE: null,
    VALIDATION: null,
    STORAGE: null,
    PERMISSION: null,
    USER_FACING: null,
    RECOVERED: null,
    TRACKING_START: null,
    TRACKING_STOP: null,
  },
} as const;

export const MOBILE_EVENTS = Object.freeze(buildTreeSchema(schema));

export type EventsTree = typeof MOBILE_EVENTS;

export type MobileEventName = EventName;

// Re-export from shared-types for convenience
export { RESOURCE_TYPES } from '@my-many-books/shared-types';

// Operation type constants for queue operations
export const OPERATION_TYPES = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const);

// Operation status constants for queue operations
export const QUEUE_OPERATION_STATUS = Object.freeze({
  PENDING: 'pending',
  RETRYING: 'retrying',
  FAILED: 'failed',
} as const);

/**
 * Array of all operation status values (derived from QUEUE_OPERATION_STATUS)
 */
export const QUEUE_OPERATION_STATUSES = Object.freeze(
  Object.values(QUEUE_OPERATION_STATUS)
) as readonly (typeof QUEUE_OPERATION_STATUS[keyof typeof QUEUE_OPERATION_STATUS])[];

// Queue size status constants for OperationQueue health monitoring
export const QUEUE_SIZE_STATUS = Object.freeze({
  APPROACHING_LIMIT: 'approaching_limit',
  LIMIT_EXCEEDED: 'limit_exceeded',
  STALE_OPERATIONS: 'stale_operations',
  HIGH_FAILURE_RATE: 'high_failure_rate',
} as const);

// Conflict resolution method constants
export const CONFLICT_RESOLUTION_METHODS = Object.freeze({
  FLAG_FOR_MANUAL_RESOLUTION: 'flag_for_manual_resolution',
  SERVER_WINS: 'server_wins',
  LOCAL_WINS: 'local_wins',
  MERGE_DATA: 'merge_data',
} as const);

// Validation type constants for sync operations
export const VALIDATION_TYPES = Object.freeze({
  MERGE_OPERATION: 'merge_operation',
  DATA_CONSISTENCY: 'data_consistency',
  FOREIGN_KEY_INTEGRITY: 'foreign_key_integrity',
  SCHEMA_VALIDATION: 'schema_validation',
} as const);

// Retry reason constants for queue operations
export const RETRY_REASONS = Object.freeze({
  MAX_RETRIES_EXCEEDED: 'max_retries_exceeded',
  CROSS_SESSION_RETRY: 'cross_session_retry',
  AUTO_RETRY: 'auto_retry',
  MANUAL_RETRY: 'manual_retry',
} as const);

export const MOBILE_CONFIG_LIMITS = Object.freeze({
  MIN_BATCH_INTERVAL: 60,
  MAX_BATCH_INTERVAL: 3600,
  MIN_OFFLINE_EVENTS: 100,
  MAX_OFFLINE_EVENTS: 10000,
  BASE_MEMORY_KB: 50,
  ANALYTICS_MEMORY_KB: 20,
  ERROR_REPORTING_MEMORY_KB: 15,
  OFFLINE_EVENT_MEMORY_KB: 0.1,
  PERFORMANCE_MEMORY_KB: 30,
  MEMORY_THRESHOLD_KB: 1000,
} as const);

export const HEALTH_SCORE_THRESHOLDS = Object.freeze({
  HEALTHY: 80,
  WARNING: 60,
  BATCH_INTERVAL_PENALTY: 10,
  HIGH_EVENTS_PENALTY: 5,
  DISABLED_FEATURES_PENALTY: 15,
} as const);

export type OperationType = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];
export type QueueOperationStatus = typeof QUEUE_OPERATION_STATUS[keyof typeof QUEUE_OPERATION_STATUS];
export type ConflictResolutionMethod = typeof CONFLICT_RESOLUTION_METHODS[keyof typeof CONFLICT_RESOLUTION_METHODS];
export type ValidationType = typeof VALIDATION_TYPES[keyof typeof VALIDATION_TYPES];
export type RetryReason = typeof RETRY_REASONS[keyof typeof RETRY_REASONS];
