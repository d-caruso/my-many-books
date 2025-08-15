/**
 * Re-export shared utilities for the web app
 */

// Re-export ISBN utilities from shared-utils
export {
  validateISBN,
  formatISBN,
  convertISBN10to13,
  normalizeISBN,
} from '@my-many-books/shared-utils';

// Re-export validation utilities
export {
  isValidEmail,
  isValidUrl,
  sanitizeString,
  isNotEmpty,
  validateMinLength,
  validateMaxLength,
} from '@my-many-books/shared-utils';

// Re-export formatting utilities
export {
  formatDate,
  formatDateTime,
  truncateText,
  capitalizeFirst,
  formatFullName,
  slugify,
} from '@my-many-books/shared-utils';

// Keep the original isbn.ts exports for backward compatibility
// TODO: Remove these once all components are updated
export * from './isbn';