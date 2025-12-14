/**
 * Shared Validation Library
 *
 * Provides consistent validation rules, constants, and validators
 * for the My Many Books application.
 */

// Export constants
export * from './constants/isbn.constants';
export * from './constants/book.constants';
export * from './constants/author.constants';
export * from './constants/category.constants';

// Export types
export * from './types/validation.types';

// Export validators
export * from './validators/isbn.validator';
export * from './validators/book.validator';
export * from './validators/author.validator';
export * from './validators/category.validator';

// Export utilities
export * from './utils/string.utils';

// Export errors
export * from './errors/i18n-keys';
