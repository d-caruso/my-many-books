/**
 * API-related type definitions powered by Zod
 */

import { z } from 'zod';
import { BookSchema, BookStatusSchema } from './book';
import { SORT_DIRECTION_VALUES } from './constants/sort-directions';
import { SEARCH_SORT_BY_FIELD_VALUES } from './constants/search';

export const PaginationMetadataSchema = z.object({
  currentPage: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  totalItems: z.number().int().nonnegative(),
  itemsPerPage: z.number().int().positive(),
});

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

export interface PaginatedResponse<T> {
  books?: T[];
  pagination: PaginationMetadata;
}

export const createPaginatedResponseSchema = <Schema extends z.ZodTypeAny>(itemSchema: Schema) =>
  z.object({
    books: itemSchema.array().optional(),
    pagination: PaginationMetadataSchema,
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const SEARCH_QUERY_MIN_LENGTH = 2;

export const SearchFiltersSchema = z.object({
  query: z.string().min(SEARCH_QUERY_MIN_LENGTH).optional(),
  status: BookStatusSchema.optional(),
  authorId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  sortBy: z.enum(
    SEARCH_SORT_BY_FIELD_VALUES as [
      typeof SEARCH_SORT_BY_FIELD_VALUES[number],
      ...typeof SEARCH_SORT_BY_FIELD_VALUES[number][]
    ]
  ).optional(),
  sortOrder: z.enum(
    SORT_DIRECTION_VALUES as [
      typeof SORT_DIRECTION_VALUES[number],
      ...typeof SORT_DIRECTION_VALUES[number][]
    ]
  ).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const SearchResultSchema = z.object({
  books: BookSchema.array(),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  page: z.number().int().nonnegative(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const ScanResultSchema = z.object({
  isbn: z.string().min(10),
  success: z.boolean(),
  error: z.string().optional(),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;
