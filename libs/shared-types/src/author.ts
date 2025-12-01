/**
 * Author-related type definitions powered by Zod
 */

import { z } from 'zod';

export const AuthorSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  surname: z.string().min(1),
  nationality: z.string().min(1).optional(),
  creationDate: z.string(),
  updateDate: z.string(),
});

export type Author = z.infer<typeof AuthorSchema>;
