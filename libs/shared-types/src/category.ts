/**
 * Category-related type definitions powered by Zod
 */

import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  creationDate: z.string(),
  updateDate: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;
