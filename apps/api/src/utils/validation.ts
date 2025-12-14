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
  BOOK_STATUSES,
} from '@my-many-books/shared-validation';

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
  editionNumber: Joi.number().integer().positive().optional(),
  editionDate: Joi.date().optional(),
  status: Joi.string()
    .valid(...BOOK_STATUSES)
    .optional(),
  notes: Joi.string().max(BOOK_CONSTRAINTS.NOTES.MAX_LENGTH).optional(),
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
