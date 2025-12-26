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

export const questionSchema = z.object({
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
  })).nullable().optional()
});

export const testSchema = z.object({
  id: z.string(),
  order: z.number().nullable(),
  name: z.string(),
  parentId: z.string().nullable(),
  minScore: z.number().nullable().optional(),
  maxErrors: z.number().nullable().optional(),
  showCorrectAnswer: z.boolean().nullable(),
  includeToStatistics: z.boolean().nullable(),
  showSkipButton: z.boolean().nullable().optional(),
  showNavigation: z.boolean().nullable().optional(),
  showBackButton: z.boolean().nullable().optional(),
  hidden: z.boolean().nullable().optional(),
  questions: z.array(questionSchema).nullable().optional(),
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

export const rescueItemSchema = z.object({
  id: z.string(),
  order: z.number().nullable().optional(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  createdAt: z.string(),
  description: z.string(),
  data: z.object({
    maxDurationMin: z.number()
  })
});

export const rescueLibraryItemSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('folder'),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('test'),
    data: z.object({
      testId: z.string().nullable().optional()
    }).optional().nullable(),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('question'),
    data: z.object({
      question: questionSchema.optional().nullable()
    }).nullable().optional(),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('medicine'),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('unknown'),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('trigger'),
    description: z.string().nullable().optional(),
    data: z.object({
      buttonType: z.enum(['button', 'toggle']).optional(),
      onSvg: z.string().optional(),
      offSvg: z.string().optional(),
      rescueLibraryItemId: z.string().nullable().optional()
    }).nullable().optional()
  })
]);

export const rescueStorySceneTriggerSchema = z.object({
  triggerId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  size: z.object({
    width: z.number(),
    height: z.number()
  })
});

export const rescueStorySceneSchema = z.object({
  backgroundImage: z.string(),
  triggers: z.array(rescueStorySceneTriggerSchema)
});

export const rescueStoryDataSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  scene: rescueStorySceneSchema
});

export const rescueStorySchema = z.object({
  id: z.string(),
  order: z.number().nullable().optional(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  rescueId: z.string(),
  description: z.string().nullable().optional(),
  createAt: z.string().nullable().optional(),
  data: rescueStoryDataSchema
});
