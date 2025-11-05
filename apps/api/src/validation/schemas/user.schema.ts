/**
 * User Validation Schemas
 *
 * Validation schemas for user-related endpoints.
 */

import Joi from 'joi';
import { commonSchemas, paginationSchema } from './common.schema';

/**
 * Update user profile schema
 */
export const updateUserSchema = Joi.object({
  name: commonSchemas.personName.optional(),
  surname: commonSchemas.personName.optional(),
  email: commonSchemas.email.optional(),
}).min(1); // At least one field must be provided

/**
 * Get user books query schema
 */
export const getUserBooksQuerySchema = paginationSchema;

/**
 * User ID param schema
 */
export const userIdParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});
