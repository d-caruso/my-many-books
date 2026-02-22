// ================================================================
// src/utils/constants.ts (add database constants)
// ================================================================

export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const);

export const ERROR_MESSAGES = Object.freeze({
  BOOK_NOT_FOUND: 'Book not found',
  BOOK_ALREADY_EXISTS: 'Book with this ISBN already exists',
  INVALID_REQUEST_BODY: 'Invalid request body',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_API_ERROR: 'External API request failed',
  INVALID_BOOK_STATUS: 'Invalid book status',
  CONNECTION_ERROR: 'Database connection failed',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
} as const);

export const API_ENDPOINTS = Object.freeze({
  OPEN_LIBRARY: 'https://openlibrary.org/api/books',
} as const);

export const DATABASE_CONFIG = Object.freeze({
  DIALECT: 'mysql' as const,
  TIMEZONE: '+00:00',
  POOL: Object.freeze({
    max: 20,
    min: 5,
    acquire: 5000,
    idle: 60000,
    evict: 30000,
  }),
} as const);

export const PAGINATION_DEFAULTS = Object.freeze({
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const);

// Database table names
export const TABLE_NAMES = Object.freeze({
  BOOKS: 'books',
  AUTHORS: 'authors',
  CATEGORIES: 'categories',
  BOOK_AUTHORS: 'book_authors',
  BOOK_CATEGORIES: 'book_categories',
  SEARCH_PINNED_RESULTS: 'search_pinned_results',
  MOBILE_ANALYTICS_EVENTS: 'mobile_analytics_events',
  MOBILE_HOOK_ACTION_EXECUTIONS: 'mobile_hook_action_executions',
} as const);

// Database field names
export const FIELD_NAMES = Object.freeze({
  CREATION_DATE: 'creation_date',
  UPDATE_DATE: 'update_date',
} as const);
