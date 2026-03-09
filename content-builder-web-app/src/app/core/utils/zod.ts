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
    relationQuestionId: z.string().nullable()
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

/** Схема параметра по таймеру (id, name, delta, startValue) */
export const rescueTimerParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  delta: z.number(),
  startValue: z.number()
});

/** Изменение параметра при выборе */
export const rescueChoiceParameterChangeSchema = z.object({
  parameterId: z.string(),
  value: z.number()
});

/** Вариант выбора в сцене */
export const rescueSceneChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  parameterChanges: z.array(rescueChoiceParameterChangeSchema).optional(),
  nextSceneId: z.string().nullable().optional()
});

/** Сцена визуальной новеллы */
export const rescueSceneSchema = z.object({
  id: z.string(),
  order: z.number().nullable().optional(),
  background: z.string(),
  text: z.string(),
  choices: z.array(rescueSceneChoiceSchema).optional(),
  hidden: z.boolean().nullable().optional()
});

export const rescueItemDataSchema = z.object({
  parameters: z.array(rescueTimerParameterSchema).optional(),
  scenes: z.array(rescueSceneSchema).optional()
});

export const rescueItemSchema = z.object({
  id: z.string(),
  order: z.number().nullable().optional(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  createdAt: z.string(),
  description: z.string(),
  data: rescueItemDataSchema.optional()
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
    type: z.literal('params-state'),
    description: z.string().nullable().optional()
  }),
  z.object({
    id: z.string(),
    order: z.number().nullable().optional(),
    name: z.string(),
    parentId: z.string().nullable().optional(),
    type: z.literal('folder-container'),
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

export const rescueStorySceneTriggerParamSchema = z.object({
  id: z.string(),
  value: z.union([z.number(), z.string()])
});

export const rescueStorySceneTriggerSchema = z.object({
  triggerId: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  size: z.object({
    width: z.number(),
    height: z.number()
  }),
  parameters: z.array(rescueStorySceneTriggerParamSchema).optional(),
  visibleParams: z.array(rescueStorySceneTriggerParamSchema).optional()
});

export const rescueStorySceneRestrictionParamSchema = z.object({
  id: z.string(),
  value: z.union([z.number(), z.string()])
});

export const rescueStorySceneRestrictionsSchema = z.object({
  params: z.array(rescueStorySceneRestrictionParamSchema)
});

export const rescueStorySceneSchema = z.object({
  backgroundImage: z.string(),
  items: z.array(rescueStorySceneTriggerSchema),
  restritions: z.array(rescueStorySceneRestrictionsSchema).optional()
});

export const rescueStoryDataSchema = z.object({
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
