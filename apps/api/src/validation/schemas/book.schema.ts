/**
 * Book Validation Schemas
 *
 * Validation schemas for book-related endpoints.
 * Leverages existing book validation from utils/validation.ts
 */

import Joi from 'joi';
import { bookValidationSchema } from '../../utils/validation';
import { commonSchemas } from './common.schema';
import { BOOK_STATUS } from '../../utils/constants';

/**
 * Create book schema
 */
export const createBookSchema = Joi.object({
  isbnCode: bookValidationSchema.isbnCode,
  title: bookValidationSchema.title,
  editionNumber: bookValidationSchema.editionNumber,
  editionDate: bookValidationSchema.editionDate,
  status: bookValidationSchema.status.default('TO_READ'),
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
    .valid(...Object.values(BOOK_STATUS))
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
    .valid(...Object.values(BOOK_STATUS))
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
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Get books query schema (with filters)
 */
export const getBooksQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .optional(),
  authorId: commonSchemas.id.optional(),
  categoryId: commonSchemas.id.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Book ID param schema
 */
export const bookIdParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});

/**
 * ISBN param schema
 */
export const isbnParamSchema = Joi.object({
  isbn: Joi.string()
    .pattern(/^(?:\d{10}|\d{13}|[\d-]{10,17})$/)
    .required()
    .messages({
      'string.pattern.base': 'ISBN must be a valid ISBN-10 or ISBN-13 format',
    }),
});
