/**
 * Book Validation Schemas
 *
 * Validation schemas for book-related endpoints.
 * Uses shared-validation library for consistent ISBN validation.
 */

import Joi from 'joi';
import { bookValidationSchema } from '../../utils/validation';
import { commonSchemas } from './common.schema';
import {
  validateIsbn,
  ISBN_CONSTRAINTS,
  ISBN_PATTERNS,
  BOOK_STATUSES,
} from '@my-many-books/shared-validation';
import { SORT_DIRECTION_VALUES } from '@my-many-books/shared-types';

/**
 * Create book schema
 */
export const createBookSchema = Joi.object({
  isbnCode: Joi.string()
    .required()
    .custom((value: string, helpers: Joi.CustomHelpers) => {
      const validation = validateIsbn(value);
      if (!validation.isValid) {
        return helpers.error('any.invalid', { message: `Invalid ISBN: ${validation.error}` });
      }
      return validation.normalizedIsbn as string;
    }),
  title: bookValidationSchema.title,
  editionNumber: bookValidationSchema.editionNumber,
  editionDate: bookValidationSchema.editionDate,
  status: bookValidationSchema.status,
  notes: bookValidationSchema.notes,
  authorIds: Joi.array().items(commonSchemas.id).min(1).optional(),
  categoryIds: Joi.array().items(commonSchemas.id).min(1).optional(),
});

/**
 * Update book schema (all fields optional, but at least one required)
 */
export const updateBookSchema = Joi.object({
  isbnCode: bookValidationSchema.isbnCode.optional(),
  title: bookValidationSchema.title.optional(),
  editionNumber: bookValidationSchema.editionNumber,
  editionDate: bookValidationSchema.editionDate,
  status: Joi.string()
    .valid(...BOOK_STATUSES)
    .allow(null)
    .optional(),
  notes: bookValidationSchema.notes,
  authorIds: Joi.array().items(commonSchemas.id).min(1).optional(),
  categoryIds: Joi.array().items(commonSchemas.id).min(1).optional(),
}).min(1);

/**
 * Patch book schema (partial update)
 */
export const patchBookSchema = Joi.object({
  status: Joi.string()
    .valid(...BOOK_STATUSES)
    .allow(null)
    .optional(),
  notes: bookValidationSchema.notes,
  editionNumber: bookValidationSchema.editionNumber,
  editionDate: bookValidationSchema.editionDate,
}).min(1);

/**
 * Search books query schema
 */
export const searchBooksQuerySchema = Joi.object({
  q: Joi.string().min(1).max(255).trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid(...SORT_DIRECTION_VALUES).default('asc'),
});

/**
 * Get books query schema (with filters)
 */
export const getBooksQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...BOOK_STATUSES)
    .optional(),
  authorId: commonSchemas.id.optional(),
  categoryId: commonSchemas.id.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid(...SORT_DIRECTION_VALUES).default('asc'),
  includeAuthors: Joi.string().optional().valid('true', 'false').default('false'),
  includeCategories: Joi.string().optional().valid('true', 'false').default('false'),
});

/**
 * Book ID param schema
 */
export const bookIdParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});

/**
 * ISBN param schema
 * Uses shared ISBN pattern for consistency
 */
export const isbnParamSchema = Joi.object({
  isbn: Joi.string()
    .min(ISBN_CONSTRAINTS.MIN_LENGTH)
    .max(ISBN_CONSTRAINTS.MAX_LENGTH)
    .pattern(ISBN_PATTERNS.NORMALIZED)
    .required()
    .messages({
      'string.pattern.base': 'ISBN must be a valid ISBN-10 or ISBN-13 format',
    }),
});
