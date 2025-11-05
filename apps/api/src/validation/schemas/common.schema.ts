/**
 * Common Validation Schemas
 *
 * Reusable validation schemas for common data types and patterns.
 * These can be composed into more complex validation schemas.
 */

import Joi from 'joi';
import { VALIDATION_RULES } from '../../utils/constants';

/**
 * Common field validations
 */
export const commonSchemas = {
  /**
   * Numeric ID (positive integer)
   */
  id: Joi.number().integer().positive(),

  /**
   * Email address
   */
  email: Joi.string().email().max(255).lowercase().trim(),

  /**
   * Password (strong password requirements)
   * - At least 8 characters
   * - Contains uppercase, lowercase, number, and special character
   */
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  /**
   * UUID v4
   */
  uuid: Joi.string().uuid({ version: 'uuidv4' }),

  /**
   * ISO 8601 date
   */
  date: Joi.date().iso(),

  /**
   * Timestamp (Unix epoch)
   */
  timestamp: Joi.number().integer().positive(),

  /**
   * Person name (first name, last name, etc.)
   */
  personName: Joi.string()
    .min(VALIDATION_RULES.AUTHOR_NAME.MIN_LENGTH)
    .max(VALIDATION_RULES.AUTHOR_NAME.MAX_LENGTH)
    .trim()
    .pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .message('Name can only contain letters, spaces, hyphens, and apostrophes'),

  /**
   * URL
   */
  url: Joi.string().uri(),

  /**
   * Boolean
   */
  boolean: Joi.boolean(),

  /**
   * ISO 639-1 language code (en, it, etc.)
   */
  languageCode: Joi.string().length(2).lowercase(),
};

/**
 * Pagination query parameters
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Sorting query parameters
 */
export const sortingSchema = Joi.object({
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Search query parameters
 */
export const searchSchema = Joi.object({
  q: Joi.string().min(1).max(255).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * ID path parameter
 */
export const idParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});
