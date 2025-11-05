/**
 * Validation Module Exports
 *
 * Central export point for all validation schemas and middleware.
 */

// Middleware
export {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  type ValidationSchema,
  type ValidationOptions,
  type ValidationTarget,
} from './middleware/validationMiddleware';

// Common schemas
export {
  commonSchemas,
  paginationSchema,
  sortingSchema,
  searchSchema,
  idParamSchema,
} from './schemas/common.schema';

// Re-export existing validation utilities
export {
  baseValidationSchema,
  authorValidationSchema,
  categoryValidationSchema,
  bookValidationSchema,
  validateAuthor,
  validateCategory,
  validateBook,
  validatePagination,
} from '../utils/validation';
