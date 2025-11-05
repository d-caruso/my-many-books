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

// User schemas
export {
  updateUserSchema,
  getUserBooksQuerySchema,
  userIdParamSchema,
} from './schemas/user.schema';

// Book schemas
export {
  createBookSchema,
  updateBookSchema,
  patchBookSchema,
  searchBooksQuerySchema,
  getBooksQuerySchema,
  bookIdParamSchema,
  isbnParamSchema,
} from './schemas/book.schema';

// Admin schemas
export {
  adminGetUsersQuerySchema,
  adminUpdateUserSchema,
  adminGetBooksQuerySchema,
  adminUpdateBookSchema,
  adminIdParamSchema,
  adminStatsQuerySchema,
} from './schemas/admin.schema';

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
