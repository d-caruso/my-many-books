/**
 * Category-related type definitions powered by Zod
 */

import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  userId: z.number().int().optional(),
  creationDate: z.string().optional(),
  updateDate: z.string().optional(),
  books: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
      })
    )
    .optional(),
});

export type Category = z.infer<typeof CategorySchema>;
