import { z } from 'zod';

export const folderSchema = z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable() });

export const articleSchema = z.object({ id: z.string(), name: z.string(), fileContentId: z.string(), parentId: z.string().nullable() });
