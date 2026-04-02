import { z } from 'zod';
import { BookFormSchema, BookSchema } from './book';

export const ExternalBookPrefillSchema = BookFormSchema.partial().extend({
  authorIds: z.array(z.number().int()),
  categoryIds: z.array(z.number().int()),
  createdAuthorIds: z.array(z.number().int()),
  createdCategoryIds: z.array(z.number().int()),
  coverImageUrlMedium: z.string().url().nullable().optional(),
  coverImageUrlLarge: z.string().url().nullable().optional(),
});

export type ExternalBookPrefill = z.infer<typeof ExternalBookPrefillSchema>;

const IsbnSearchNotFoundSchema = z.object({
  found: z.literal(false),
});

const IsbnSearchLocalBookSchema = z.object({
  found: z.literal(true),
  external: z.literal(false),
  book: BookSchema,
});

const IsbnSearchExternalBookSchema = z.object({
  found: z.literal(true),
  external: z.literal(true),
  book: ExternalBookPrefillSchema,
});

export const IsbnSearchResponseSchema = z.union([
  IsbnSearchNotFoundSchema,
  IsbnSearchLocalBookSchema,
  IsbnSearchExternalBookSchema,
]);

type IsbnSearchNotFound = z.infer<typeof IsbnSearchNotFoundSchema>;
type IsbnSearchLocalBook = z.infer<typeof IsbnSearchLocalBookSchema>;
type IsbnSearchExternalBook = z.infer<typeof IsbnSearchExternalBookSchema>;

export type IsbnSearchResponse =
  | IsbnSearchNotFound
  | IsbnSearchLocalBook
  | IsbnSearchExternalBook;
