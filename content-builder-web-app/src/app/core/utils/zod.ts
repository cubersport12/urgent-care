import { z } from 'zod';

export const folderSchema = z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable() });

export const articleSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  nextRunArticle: z.string().nullable(),
  timeRead: z.number().nullable(),
  disableWhileNotPrevComplete: z.boolean().nullable(),
  hideWhileNotPrevComplete: z.boolean().nullable(),
  includeToStatistics: z.boolean().nullable()
});
