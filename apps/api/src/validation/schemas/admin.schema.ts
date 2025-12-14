/**
 * Admin Validation Schemas
 *
 * Validation schemas for admin-only endpoints.
 * Uses shared-validation library for consistent ISBN validation.
 */

import Joi from 'joi';
import { commonSchemas } from './common.schema';
import { BOOK_STATUS } from '../../utils/constants';
import { ISBN_CONSTRAINTS, ISBN_PATTERNS } from '@my-many-books/shared-validation';

/**
 * Admin get users query schema
 */
export const adminGetUsersQuerySchema = Joi.object({
  search: Joi.string().min(1).max(255).trim().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Admin update user schema
 */
export const adminUpdateUserSchema = Joi.object({
  name: commonSchemas.personName.optional(),
  surname: commonSchemas.personName.optional(),
  email: commonSchemas.email.optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

/**
 * Admin get books query schema
 */
export const adminGetBooksQuerySchema = Joi.object({
  search: Joi.string().min(1).max(255).trim().optional(),
  status: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .optional(),
  userId: commonSchemas.id.optional(),
  authorId: commonSchemas.id.optional(),
  categoryId: commonSchemas.id.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Admin update book schema
 *
 * IMPORTANT: Uses shared ISBN validation to allow 'X' character
 * and ensure consistency with frontend validation.
 */
export const adminUpdateBookSchema = Joi.object({
  isbnCode: Joi.string()
    .min(ISBN_CONSTRAINTS.MIN_LENGTH)
    .max(ISBN_CONSTRAINTS.MAX_LENGTH)
    .pattern(ISBN_PATTERNS.NORMALIZED)
    .optional()
    .messages({
      'string.pattern.base': 'ISBN must contain only digits and X (case insensitive)',
      'string.min': `ISBN must be at least ${ISBN_CONSTRAINTS.MIN_LENGTH} characters`,
      'string.max': `ISBN must be at most ${ISBN_CONSTRAINTS.MAX_LENGTH} characters`,
    }),
  title: Joi.string().min(1).max(500).optional(),
  editionNumber: Joi.number().integer().positive().optional(),
  editionDate: Joi.date().optional(),
  status: Joi.string()
    .valid(...Object.values(BOOK_STATUS))
    .optional(),
  notes: Joi.string().max(2000).allow('').optional(),
  userId: commonSchemas.id.optional(), // Admin can reassign book to different user
}).min(1);

/**
 * Admin user/book ID param schemas
 */
export const adminIdParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});

/**
 * Admin stats query schema
 */
export const adminStatsQuerySchema = Joi.object({
  startDate: commonSchemas.date.optional(),
  endDate: commonSchemas.date.optional(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional(),
});
