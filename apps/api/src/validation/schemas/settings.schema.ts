/**
 * Settings Validation Schemas
 *
 * Validation schemas for settings endpoints.
 */

import Joi from 'joi';

/**
 * Setting key param schema
 */
export const settingKeyParamSchema = Joi.object({
  key: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-z0-9._]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Setting key must contain only lowercase letters, numbers, dots, and underscores',
      'string.min': 'Setting key must be at least 1 character',
      'string.max': 'Setting key must be at most 100 characters',
    }),
});

/**
 * Update setting body schema
 * Value can be any type since we store as JSON
 */
export const updateSettingBodySchema = Joi.object({
  value: Joi.any().required(),
}).required();

/**
 * Toggle active body schema
 */
export const toggleActiveBodySchema = Joi.object({
  active: Joi.boolean().required(),
}).required();
