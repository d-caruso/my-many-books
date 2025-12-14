/**
 * Category Validation Constants
 *
 * Single source of truth for category field validation rules.
 * Used by both backend (Joi) and frontend (Zod) validation schemas.
 */

/**
 * Category field length constraints
 */
export const CATEGORY_CONSTRAINTS = Object.freeze({
  NAME: Object.freeze({
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
  } as const),
} as const);

/**
 * Category validation error messages
 */
export const CATEGORY_ERROR_MESSAGES = Object.freeze({
  NAME_REQUIRED: 'Category name is required',
  NAME_TOO_SHORT: `Category name must be at least ${CATEGORY_CONSTRAINTS.NAME.MIN_LENGTH} character`,
  NAME_TOO_LONG: `Category name must be at most ${CATEGORY_CONSTRAINTS.NAME.MAX_LENGTH} characters`,
} as const);
