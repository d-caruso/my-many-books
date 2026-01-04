type SchemaMap = { [key: string]: SchemaMap | null };

type AnyNode<T extends SchemaMap> = keyof T extends never ? Record<never, never> : { ANY: string };

export type BuildResult<T extends SchemaMap> = {
  [K in keyof T]-?: T[K] extends null ? string : BuildResult<Extract<T[K], SchemaMap>>;
} & AnyNode<T>;

const join = (parts: string[]): string => parts.join('.');

function build<T extends SchemaMap>(schema: T, parents: string[] = []): BuildResult<T> {
  const result: Record<string, unknown> = {};
  const keys = Object.keys(schema) as (keyof T)[];

  for (const key of keys) {
    const value = schema[key];
    const path = [...parents, (key as string).toLowerCase()];

    if (value === null) {
      result[key as string] = join(path);
    } else {
      result[key as string] = build(value as Extract<typeof value, SchemaMap>, path);
    }
  }

  if (keys.length > 0) {
    result['ANY'] = join([...parents, '*']);
  }

  return result as BuildResult<T>;
}

const schema = {
  // Handler Events (CRUD operations)
  BOOK: {
    CREATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    READ: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    UPDATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    DELETE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
  },
  AUTHOR: {
    CREATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    READ: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    UPDATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    DELETE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
  },
  CATEGORY: {
    CREATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    READ: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    UPDATE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
    DELETE: {
      START: null,
      SUCCESS: null,
      FAILED: null,
    },
  },
  // Queue Events
  QUEUE: {
    ENQUEUE: null,
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
  },
} as const;

export const MOBILE_EVENTS = Object.freeze(build(schema));

export type EventsTree = typeof MOBILE_EVENTS;

// Re-export from shared-types for convenience
export { RESOURCE_TYPES } from '@my-many-books/shared-types';

// Operation type constants for queue operations
export const OPERATION_TYPES = Object.freeze({
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const);

// Operation status constants for queue operations
export const OPERATION_STATUSES = Object.freeze({
  PENDING: 'pending',
  RETRYING: 'retrying',
  FAILED: 'failed',
} as const);

export type OperationType = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];
export type OperationStatus = typeof OPERATION_STATUSES[keyof typeof OPERATION_STATUSES];