import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  AppTestAccessablityLogicalOperator,
  AppTestQuestionActivationConditionKind,
  RescueCompletionCompareOperator,
  RescueCompletionConditionVm,
  RescueCompletionLogicalOperator,
  RescueParameterSeverityEnum
} from './types';

export const folderSchema = z.object({
  id: z.string(),
  order: z.number().nullable(),
  name: z.string(),
  parentId: z.string().nullable(),
  requiredTariffId: z.string().nullable().optional()
});

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
  linksToArticles: z.array(z.object({ key: z.string(), articleId: z.string() })).nullable(),
  requiredTariffId: z.string().nullable().optional()
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
  randomizeQuestions: z.boolean().nullable().optional(),
  questionsToShow: z.number().nullable().optional(),
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
  })).nullable(),
  requiredTariffId: z.string().nullable().optional()
});

/** Уровень серьёзности параметра (диапазон + метка) */
export const rescueParameterSeveritySchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  severity: z.nativeEnum(RescueParameterSeverityEnum).optional(),
  description: z.string().optional()
});

/** Схема параметра по таймеру (id, name, delta, startValue, type?, severities?) */
export const rescueTimerParameterSchema = z.object({
  id: z.string().describe('UUID параметра'),
  name: z.string().describe('Отображаемое имя параметра'),
  delta: z.number().describe('Изменение за тик таймера; для type=timer обычно 0'),
  startValue: z.number().describe('Стартовое значение: число или секунды суток для timer'),
  type: z.enum(['numeric', 'timer']).optional().describe('numeric — число; timer — время'),
  severities: z.array(rescueParameterSeveritySchema).optional().describe('Диапазоны и уровни серьёзности'),
  isHidden: z.boolean().nullable().optional().describe('Скрыть параметр в UI')
});

/** Изменение параметра при выборе */
export const rescueChoiceParameterChangeSchema = z.object({
  parameterId: z.string().describe('id параметра из data.parameters'),
  value: z.number().describe('На сколько изменить параметр (может быть отрицательным)')
});

/** Последствие выбора в сцене (описание + серьёзность) */
export const rescueSceneChoiceImplicationSchema = z.object({
  description: z.string().describe('Текст последствия выбора'),
  severity: z.nativeEnum(RescueParameterSeverityEnum).describe('Уровень серьёзности: normal | low | medium | high')
});

/** Вариант выбора в сцене */
export const rescueSceneChoiceSchema = z.object({
  id: z.string().describe('UUID варианта выбора'),
  text: z.string().describe('Текст кнопки / действия игрока'),
  parameterChanges: z.array(rescueChoiceParameterChangeSchema).optional().describe('Изменения параметров после выбора'),
  nextSceneId: z.string().nullable().optional().describe('id следующей сцены; null — конец ветки'),
  implications: z.array(rescueSceneChoiceImplicationSchema).default([]).describe('Последствия выбора')
});

/** Сцена визуальной новеллы */
export const rescueSceneSchema = z.object({
  id: z.string().describe('UUID сцены'),
  order: z.number().nullable().optional().describe('Порядок сцены в сценарии'),
  background: z.string().describe('URL или id файла фона'),
  text: z.string().describe('Текст сцены — описание ситуации'),
  choices: z.array(rescueSceneChoiceSchema).optional().describe('Варианты действий; пустой массив — вводный слайд без выбора'),
  hidden: z.boolean().nullable().optional().describe('Скрыть сцену'),
  isReviewed: z.boolean().nullable().optional().describe('Сцена проверена редактором')
});

/** Лист дерева: сравнение параметра с числом */
export const rescueCompletionCompareSchema = z.object({
  type: z.literal('compare'),
  parameterId: z.string().describe('id из parameters'),
  operator: z.nativeEnum(RescueCompletionCompareOperator).describe('eq | neq | gt | gte | lt | lte'),
  value: z.number().describe('Константа для сравнения')
});

/** Рекурсивное условие завершения спасения (compare | group) */
export const rescueCompletionConditionSchema: z.ZodType<RescueCompletionConditionVm> = z.lazy(() =>
  z.discriminatedUnion('type', [
    rescueCompletionCompareSchema,
    z.object({
      type: z.literal('group'),
      logicalOperator: z.nativeEnum(RescueCompletionLogicalOperator),
      conditions: z.array(rescueCompletionConditionSchema)
    })
  ])
);

export const appRescueItemCompletionSchema = z.object({
  success: rescueCompletionConditionSchema.nullable().optional().describe('Дерево условий успешного завершения'),
  failure: rescueCompletionConditionSchema.nullable().optional().describe('Дерево условий неуспешного завершения')
});

/** Безопасный разбор `AppRescueItemCompletionVm` (например после редактирования в UI) */
export function safeParseAppRescueItemCompletion(data: unknown) {
  return appRescueItemCompletionSchema.safeParse(data);
}

export const rescueItemDataSchema = z.object({
  parameters: z.array(rescueTimerParameterSchema).optional().describe('Общие параметры, изменяемые по таймеру'),
  scenes: z.array(rescueSceneSchema).optional().describe('Сцены визуальной новеллы'),
  defaultBackground: z.string().optional().describe('URL или id фона по умолчанию'),
  completion: appRescueItemCompletionSchema.optional().describe('Условия успеха и неуспеха')
});

/** JSON Schema AppRescueItemDataVm для вставки в промпт */
export function formatRescueItemDataSchemaForPrompt(): string {
  return JSON.stringify(
    zodToJsonSchema(rescueItemDataSchema, {
      name: 'AppRescueItemDataVm',
      $refStrategy: 'none'
    }),
    null,
    2
  );
}

/** Slim question list for AI generation (no activation branches). */
export const aiGeneratedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        questionText: z.string(),
        name: z.string().optional(),
        answers: z
          .array(
            z.object({
              answerText: z.string(),
              isCorrect: z.boolean(),
              score: z.number().nullable().optional()
            })
          )
          .min(2)
      })
    )
    .min(1)
});

export function formatAiGeneratedQuestionsSchemaForPrompt(): string {
  return JSON.stringify(
    zodToJsonSchema(aiGeneratedQuestionsSchema, {
      name: 'AiGeneratedQuestions',
      $refStrategy: 'none'
    }),
    null,
    2
  );
}

export const rescueItemSchema = z.object({
  id: z.string(),
  order: z.number().nullable().optional(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  createdAt: z.string(),
  description: z.string(),
  data: rescueItemDataSchema.optional(),
  requiredTariffId: z.string().nullable().optional()
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
