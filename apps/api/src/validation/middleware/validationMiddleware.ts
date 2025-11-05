/**
 * Validation Middleware
 *
 * Express middleware for validating requests using Joi schemas.
 * Validates request body, query parameters, and path parameters.
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { i18n } from '@my-many-books/shared-i18n';

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

/**
 * Validation target options
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation schema definition
 */
export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  abortEarly?: boolean; // Stop on first error
  stripUnknown?: boolean; // Remove unknown fields
  allowUnknown?: boolean; // Allow unknown fields without removing
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  abortEarly: false, // Return all errors
  stripUnknown: true, // Strip unknown fields for security
  allowUnknown: false,
};

/**
 * Format Joi validation errors into user-friendly messages
 */
function formatValidationErrors(error: Joi.ValidationError): Array<{
  field: string;
  message: string;
}> {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
  }));
}

/**
 * Validation middleware factory
 * Creates Express middleware that validates requests against provided Joi schema
 *
 * @param schema - Joi validation schema for body, query, and/or params
 * @param options - Validation options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const createBookSchema = {
 *   body: Joi.object({
 *     title: Joi.string().required(),
 *     isbn: Joi.string().isbn().required()
 *   })
 * };
 *
 * router.post('/books', validate(createBookSchema), createBookHandler);
 * ```
 */
export function validate(schema: ValidationSchema, options: ValidationOptions = {}) {
  const validationOptions = { ...DEFAULT_OPTIONS, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string }> = [];

    // Initialize validated object
    req.validated = {};

    // Validate body
    if (schema.body) {
      const result = schema.body.validate(req.body, validationOptions);

      if (result.error) {
        errors.push(...formatValidationErrors(result.error));
      } else if (result.value) {
        req.body = result.value;
        req.validated.body = result.value;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const result = schema.query.validate(req.query, validationOptions);

      if (result.error) {
        errors.push(...formatValidationErrors(result.error));
      } else if (result.value) {
        req.query = result.value;
        req.validated.query = result.value;
      }
    }

    // Validate path parameters
    if (schema.params) {
      const result = schema.params.validate(req.params, validationOptions);

      if (result.error) {
        errors.push(...formatValidationErrors(result.error));
      } else if (result.value) {
        req.params = result.value;
        req.validated.params = result.value;
      }
    }

    // If validation errors exist, return 400 Bad Request
    if (errors.length > 0) {
      res.status(400).json({
        error: i18n.t('errors.validation_failed'),
        details: errors,
      });
      return;
    }

    // Validation passed, continue to next middleware
    next();
  };
}

/**
 * Shorthand for validating request body only
 */
export function validateBody(
  schema: Joi.ObjectSchema,
  options?: ValidationOptions
): ReturnType<typeof validate> {
  return validate({ body: schema }, options);
}

/**
 * Shorthand for validating query parameters only
 */
export function validateQuery(
  schema: Joi.ObjectSchema,
  options?: ValidationOptions
): ReturnType<typeof validate> {
  return validate({ query: schema }, options);
}

/**
 * Shorthand for validating path parameters only
 */
export function validateParams(
  schema: Joi.ObjectSchema,
  options?: ValidationOptions
): ReturnType<typeof validate> {
  return validate({ params: schema }, options);
}
