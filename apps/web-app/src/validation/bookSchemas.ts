/**
 * Book Validation Schemas (Zod)
 *
 * Frontend validation schemas using Zod.
 * Uses shared-validation library for ISBN validation logic.
 */

import { z } from 'zod';
import {
  isValidIsbnFormat,
  validateEditionDate,
  ISBN_CONSTRAINTS,
  BOOK_CONSTRAINTS,
  BOOK_ERROR_MESSAGES,
} from '@my-many-books/shared-validation';
import { BOOK_STATUSES } from '@my-many-books/shared-types';

/**
 * Book status enum
 * Uses shared-validation BOOK_STATUSES for consistency
 */
const bookStatusEnum = z.enum(BOOK_STATUSES as [string, ...string[]]);

/**
 * Base ISBN validation schema
 * Uses shared-validation library for consistent validation with backend
 */
const isbnSchema = z
  .string()
  .min(1, 'ISBN is required')
  .refine(
    (value) => isValidIsbnFormat(value),
    {
      message: `Invalid ISBN format. Must be ${ISBN_CONSTRAINTS.MIN_LENGTH}-${ISBN_CONSTRAINTS.MAX_LENGTH} digits, may contain 'X'`,
    }
  );

/**
 * Edition date validation schema.
 * Accepts flexible granularity: YYYY, YYYY-MM, or YYYY-MM-DD.
 */
const editionDateSchema = z
  .string()
  .optional()
  .refine((value) => value === undefined || value === '' || validateEditionDate(value).isValid, {
    message: BOOK_ERROR_MESSAGES.EDITION_DATE_INVALID,
  })
  ;

/**
 * Create Book Schema (User)
 *
 * Strict validation for creating new books.
 * All fields required except optional ones.
 * Uses shared-validation constraints for consistency with backend.
 */
export const createBookSchema = z.object({
  title: z
    .string()
    .min(BOOK_CONSTRAINTS.TITLE.MIN_LENGTH, 'Title is required')
    .max(BOOK_CONSTRAINTS.TITLE.MAX_LENGTH, 'Title too long'),
  isbnCode: isbnSchema,
  editionNumber: z.number().int().positive().optional(),
  editionDate: editionDateSchema,
  status: bookStatusEnum.optional(),
  notes: z.string().max(BOOK_CONSTRAINTS.NOTES.MAX_LENGTH, 'Notes too long').nullable().optional(),
  selectedAuthors: z.array(z.any()).optional(), // Author objects
  selectedCategories: z.array(z.number()).optional(),
  coverImageUrlMedium: z.string().nullable().optional(),
  coverImageUrlLarge: z.string().nullable().optional(),
});

/**
 * Update Book Schema (User)
 *
 * Partial validation for updating books.
 * All fields optional, but must be valid if provided.
 */
export const updateBookSchema = createBookSchema.partial();

/**
 * Admin Book Schema
 *
 * Flexible validation for admin book updates.
 * Allows partial updates with all fields optional.
 */
export const adminBookSchema = z.object({
  title: z
    .string()
    .min(BOOK_CONSTRAINTS.TITLE.MIN_LENGTH, 'Title is required')
    .max(BOOK_CONSTRAINTS.TITLE.MAX_LENGTH, 'Title too long')
    .optional(),
  isbnCode: isbnSchema.optional(),
  editionNumber: z.number().int().positive().optional(),
  editionDate: editionDateSchema,
  status: bookStatusEnum.optional(),
  notes: z.string().max(BOOK_CONSTRAINTS.NOTES.MAX_LENGTH, 'Notes too long').nullable().optional(),
});

/**
 * Type exports for TypeScript
 */
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type AdminBookInput = z.infer<typeof adminBookSchema>;
