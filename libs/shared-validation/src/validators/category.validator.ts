/**
 * Category Validation Functions
 *
 * Pure TypeScript validation functions for category fields.
 * Framework-agnostic, can be used by Joi, Zod, or custom validators.
 */

import {
  CATEGORY_CONSTRAINTS,
  CATEGORY_ERROR_MESSAGES,
} from '../constants/category.constants';
import { ValidationResult } from '../types/validation.types';
import { isEmpty, trim } from '../utils/string.utils';

/**
 * Validate category name
 */
export function validateCategoryName(name: string): ValidationResult {
  if (isEmpty(name)) {
    return {
      isValid: false,
      error: CATEGORY_ERROR_MESSAGES.NAME_REQUIRED,
      errorCode: 'NAME_REQUIRED',
    };
  }

  const trimmed = trim(name);

  if (trimmed.length < CATEGORY_CONSTRAINTS.NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: CATEGORY_ERROR_MESSAGES.NAME_TOO_SHORT,
      errorCode: 'NAME_TOO_SHORT',
    };
  }

  if (trimmed.length > CATEGORY_CONSTRAINTS.NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: CATEGORY_ERROR_MESSAGES.NAME_TOO_LONG,
      errorCode: 'NAME_TOO_LONG',
    };
  }

  return { isValid: true };
}

/**
 * Check if a category name is valid (for quick validation)
 */
export function isValidCategoryName(name: string): boolean {
  if (isEmpty(name)) {
    return false;
  }

  const trimmed = trim(name);

  return (
    trimmed.length >= CATEGORY_CONSTRAINTS.NAME.MIN_LENGTH &&
    trimmed.length <= CATEGORY_CONSTRAINTS.NAME.MAX_LENGTH
  );
}
