/**
 * Book-related type definitions powered by Zod
 */

import { z } from 'zod';
import { AuthorSchema } from './author';
import { CategorySchema } from './category';
import { BOOK_STATUSES } from './constants/book.constants'

export const BookStatusSchema = z.enum(
    BOOK_STATUSES as readonly [string, ...string[]] as [typeof BOOK_STATUSES[number], ...typeof BOOK_STATUSES[number][]]
  ).nullable();
type InferredBookStatus = z.infer<typeof BookStatusSchema>;

export const BookSchema = z.object({
  id: z.number().int(),
  isbnCode: z.string().min(1),
  title: z.string().min(1),
  editionNumber: z.number().int().positive().nullable().optional(),
  editionDate: z.string().nullable().optional(),
  status: BookStatusSchema.optional().catch(null),
  notes: z.string().nullable().optional(),
  userId: z.number().int().optional(),
  authors: AuthorSchema.pick({ id: true, name: true, surname: true }).array().optional(),
  categories: CategorySchema.pick({ id: true, name: true }).array().optional(),
  creationDate: z.string().optional(),
  updateDate: z.string().optional(),
});

export type Book = z.infer<typeof BookSchema>;

export const BookFormSchema = z.object({
  title: z.string().min(1),
  isbnCode: z.string().min(1),
  editionNumber: z.number().int().positive().nullable().optional(),
  editionDate: z.string().nullable().optional(),
  status: BookStatusSchema.optional(),
  notes: z.string().nullable().optional(),
  authorIds: z.array(z.number().int()).optional(),
  categoryIds: z.array(z.number().int()).optional(),
});

export type BookFormData = z.infer<typeof BookFormSchema>;

export interface BookCardProps {
  book: Book;
  onEdit?: (book: Book) => void;
  onDelete?: (bookId: number) => void;
  onStatusChange?: (bookId: number, status: InferredBookStatus) => void;
}
