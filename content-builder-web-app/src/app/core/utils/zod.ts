import { z } from 'zod';
import { AppTestAccessablityLogicalOperator } from './types';

export const folderSchema = z.object({ id: z.string(), order: z.number().nullable(), name: z.string(), parentId: z.string().nullable() });

export const articleSchema = z.object({
  id: z.string(),
  order: z.number().nullable(),
  name: z.string(),
  parentId: z.string().nullable(),
  nextRunArticle: z.string().nullable(),
  timeRead: z.number().nullable(),
  disableWhileNotPrevComplete: z.boolean().nullable(),
  hideWhileNotPrevComplete: z.boolean().nullable(),
  includeToStatistics: z.boolean().nullable(),
  linksToArticles: z.array(z.object({ key: z.string(), articleId: z.string() })).nullable()
});
export const testSchema = z.object({
  id: z.string(),
  order: z.number().nullable(),
  name: z.string(),
  parentId: z.string().nullable(),
  accessabilityConditions: z.array(z.object({
    logicalOperator: z.enum([AppTestAccessablityLogicalOperator.And, AppTestAccessablityLogicalOperator.Or]),
    type: z.enum(['test', 'article']),
    testId: z.string().optional(),
    articleId: z.string().optional(),
    data: z.object({
      type: z.enum(['score', 'succedded']),
      score: z.number().nullable().optional(),
      success: z.boolean().nullable().optional()
    }).optional(),
    isReaded: z.boolean().nullable().optional()
  })).nullable()
});
