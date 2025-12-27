/**
 * Hook Validation Schemas
 *
 * Validation schemas for hook management endpoints.
 * Integrates with hookey library's Zod schemas for actionConfig validation.
 */

import Joi from 'joi';
import { commonSchemas } from './common.schema';
import { validateEventPattern, safeValidateActionConfig } from '@my-many-books/hookey';
import { SORT_DIRECTION_VALUES } from '@my-many-books/shared-types';

/**
 * Custom Joi validator for event patterns
 * Uses hookey's validateEventPattern function
 */
const eventPatternValidator = (value: string, helpers: Joi.CustomHelpers) => {
  try {
    validateEventPattern(value);
    return value;
  } catch (error) {
    if (error instanceof Error) {
      return helpers.error('any.custom', { message: error.message });
    }
    return helpers.error('any.custom', { message: 'Invalid event pattern' });
  }
};

/**
 * Custom Joi validator for action config
 * Uses hookey's safeValidateActionConfig function
 */
const actionConfigValidator = (value: unknown, helpers: Joi.CustomHelpers) => {
  // Access the parent object to get actionType
  const parent = (helpers.state.ancestors as unknown[])?.[0] as { actionType?: string } | undefined;
  const actionType = parent?.actionType;

  if (!actionType) {
    return helpers.error('any.custom', {
      message: 'actionType must be provided to validate actionConfig',
    });
  }

  const result = safeValidateActionConfig(actionType, value);

  if (!result.success) {
    let errorMessage = 'Invalid action configuration';
    if (result.error instanceof Error) {
      errorMessage = result.error.message;
    } else if (
      typeof result.error === 'object' &&
      result.error !== null &&
      'issues' in result.error
    ) {
      const zodError = result.error as { issues: Array<{ message: string }> };
      errorMessage = zodError.issues.map(i => i.message).join(', ');
    }
    return helpers.error('any.custom', { message: errorMessage });
  }

  return value;
};

/**
 * Hook create/update body schemas
 */
export const createHookBodySchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).allow('', null).optional(),
  eventPattern: Joi.string().min(1).max(255).required().custom(eventPatternValidator),
  actionType: Joi.string().valid('log', 'email', 'database').required(),
  actionConfig: Joi.object().required().custom(actionConfigValidator),
  isActive: Joi.boolean().default(true),
  priority: Joi.number().integer().min(0).max(999).default(0),
});

export const updateHookBodySchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).allow('', null).optional(),
  eventPattern: Joi.string().min(1).max(255).optional().custom(eventPatternValidator),
  actionType: Joi.string().valid('log', 'email', 'database').optional(),
  actionConfig: Joi.object().optional().custom(actionConfigValidator),
  isActive: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).max(999).optional(),
}).min(1);

/**
 * Hook query schemas
 */
export const listHooksQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isActive: Joi.string().valid('true', 'false').optional(),
  search: Joi.string().min(1).max(255).trim().optional(),
  sortBy: Joi.string().valid('priority', 'name', 'creationDate', 'updateDate').default('priority'),
  sortOrder: Joi.string().valid(...SORT_DIRECTION_VALUES).default('desc'),
});

export const getExecutionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  success: Joi.string().valid('true', 'false').optional(),
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
});

export const getRecentExecutionsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(50),
});

/**
 * Hook param schemas
 */
export const hookIdParamSchema = Joi.object({
  id: commonSchemas.id.required(),
});
