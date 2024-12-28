import { z } from 'zod';

export const folderSchema = z.object({ id: z.string(), name: z.string(), parentId: z.string().nullable() });
