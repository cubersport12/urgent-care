import { z } from 'zod';
import { AppTestAccessablityLogicalOperator, AppTestQuestionActivationConditionKind } from './types';

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
  minScore: z.number().nullable().optional(),
  maxErrors: z.number().nullable().optional(),
  questions: z.array(z.object({
    id: z.string(),
    order: z.number().nullable(),
    questionText: z.string(),
    name: z.string(),
    image: z.string().nullable().optional(),
    activationCondition: z.object({
      kind: z.enum([AppTestQuestionActivationConditionKind.CompleteQuestion]),
      data: z.object({
        type: z.enum(['score', 'correct']),
        score: z.number().nullable().optional(),
        isCorrect: z.boolean().nullable().optional()
      }),
      relationQuestionId: z.string()
    }).nullable().optional(),
    answers: z.array(z.object({
      answerText: z.string(),
      isCorrect: z.boolean(),
      score: z.number().nullable(),
      image: z.string().nullable().optional()
    })).nullable()
  })).nullable().optional(),
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
