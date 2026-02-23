// ================================================================
// src/utils/validation.ts
// ================================================================
//
// Legacy Joi schemas using shared-validation constants.
// New code should use validation/schemas/*.schema.ts instead.
//

import Joi from 'joi';
import {
  AUTHOR_CONSTRAINTS,
  CATEGORY_CONSTRAINTS,
  BOOK_CONSTRAINTS,
  ISBN_CONSTRAINTS,
  EDITION_DATE_PATTERN,
} from '@my-many-books/shared-validation';
import { BOOK_STATUSES } from '@my-many-books/shared-types';


// Base validation schemas
export const baseValidationSchema = {
  id: Joi.number().integer().positive(),
  creationDate: Joi.date(),
  updateDate: Joi.date(),
};

// Author validation schemas
export const authorValidationSchema = {
  ...baseValidationSchema,
  name: Joi.string()
    .min(AUTHOR_CONSTRAINTS.NAME.MIN_LENGTH)
    .max(AUTHOR_CONSTRAINTS.NAME.MAX_LENGTH)
    .required(),
  surname: Joi.string()
    .min(AUTHOR_CONSTRAINTS.SURNAME.MIN_LENGTH)
    .max(AUTHOR_CONSTRAINTS.SURNAME.MAX_LENGTH)
    .required(),
  nationality: Joi.string().max(AUTHOR_CONSTRAINTS.NATIONALITY.MAX_LENGTH).optional(),
};

// Category validation schemas
export const categoryValidationSchema = {
  ...baseValidationSchema,
  name: Joi.string()
    .min(CATEGORY_CONSTRAINTS.NAME.MIN_LENGTH)
    .max(CATEGORY_CONSTRAINTS.NAME.MAX_LENGTH)
    .required(),
};

// Book validation schemas
export const bookValidationSchema = {
  ...baseValidationSchema,
  isbnCode: Joi.string()
    .min(ISBN_CONSTRAINTS.MIN_LENGTH)
    .max(ISBN_CONSTRAINTS.MAX_LENGTH)
    .pattern(/^[\d-]+$/)
    .required(),
  title: Joi.string()
    .min(BOOK_CONSTRAINTS.TITLE.MIN_LENGTH)
    .max(BOOK_CONSTRAINTS.TITLE.MAX_LENGTH)
    .required(),
  editionNumber: Joi.number().integer().positive().allow(null).optional(),
  editionDate: Joi.string()
    .pattern(EDITION_DATE_PATTERN)
    .custom((value: string, helpers: Joi.CustomHelpers) => {
      const parts = value.split('-').map(Number);
      const month = parts[1];
      const day = parts[2];
      if (month !== undefined && (month < 1 || month > 12)) {
        return helpers.error('any.invalid');
      }
      if (day !== undefined && (day < 1 || day > 31)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'Edition date must be YYYY, YYYY-MM, or YYYY-MM-DD',
    }),
  status: Joi.string()
    .valid(...BOOK_STATUSES)
    .optional(),
  notes: Joi.string().max(BOOK_CONSTRAINTS.NOTES.MAX_LENGTH).allow(null).optional(),
};

// Validation functions
export const validateAuthor = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(authorValidationSchema);
  return schema.validate(data);
};

export const validateCategory = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(categoryValidationSchema);
  return schema.validate(data);
};

export const validateBook = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object(bookValidationSchema);
  return schema.validate(data);
};

export const validatePagination = (data: unknown): Joi.ValidationResult => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  });
  return schema.validate(data);
};
