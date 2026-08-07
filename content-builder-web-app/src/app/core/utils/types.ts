/**
 * App view-models: OpenAPI-generated DTOs + local domain shapes for JSONB.
 */
import type {
  ArticleOut,
  FolderOut,
  LinkToArticle,
  RescueOut,
  TestOut,
  UserOut,
} from '@/core/api/generated/types.gen';

export type NullableValue<T> = T | null | undefined;

export type AppIdentity = { id: string };
export type AppBaseVm = {
  name: string;
  order?: number | null;
  parentId: NullableValue<string>;
} & AppIdentity;

/** UI/store models: OpenAPI DTOs softened so form values may be `undefined`. */
export type AppFolderVm = Omit<FolderOut, 'order' | 'parentId'> & {
  order?: NullableValue<number>;
  parentId?: NullableValue<string>;
};

export type AppLinkToArticleVm = LinkToArticle;

export type AppArticleVm = Omit<
  ArticleOut,
  | 'order'
  | 'parentId'
  | 'nextRunArticle'
  | 'timeRead'
  | 'disableWhileNotPrevComplete'
  | 'hideWhileNotPrevComplete'
  | 'includeToStatistics'
  | 'linksToArticles'
> & {
  order?: NullableValue<number>;
  parentId?: NullableValue<string>;
  nextRunArticle?: NullableValue<string>;
  timeRead?: NullableValue<number>;
  disableWhileNotPrevComplete?: NullableValue<boolean>;
  hideWhileNotPrevComplete?: NullableValue<boolean>;
  includeToStatistics?: NullableValue<boolean>;
  linksToArticles?: NullableValue<AppLinkToArticleVm[]>;
};

export type AppTestQuestionAnswerVm = {
  answerText: string;
  image?: NullableValue<string>;
  score?: number;
  isCorrect?: boolean;
};

export enum AppTestQuestionActivationConditionKind {
  CompleteQuestion = 'CompleteQuestion'
}

export type AppTestQuestionActivationConditionScoreData = {
  type: 'score';
  score: number;
};
export type AppTestQuestionActivationConditionCorrectData = {
  type: 'correct';
  isCorrect: boolean;
};
export type AppTestQuestionActivationCondition = {
  kind: AppTestQuestionActivationConditionKind;
  data: AppTestQuestionActivationConditionScoreData | AppTestQuestionActivationConditionCorrectData;
  relationQuestionId: string;
};

export type AppTestQuestionVm = {
  questionText: string;
  image?: NullableValue<string>;
  answers: NullableValue<AppTestQuestionAnswerVm[]>;
  activationCondition?: AppTestQuestionActivationCondition;
} & AppBaseVm;

export enum AppTestAccessablityLogicalOperator {
  And = 'and',
  Or = 'or'
}

export type AppTestAccessablityCondition = {
  logicalOperator?: AppTestAccessablityLogicalOperator;
} & (AppTestAccessablityConditionTest | AppTestAccessablityConditionArticle);

export type AppTestAccessablityConditionTestScore = {
  type: 'score';
  score: number;
};
export type AppTestAccessablityConditionTestSuccedded = {
  type: 'succedded';
  success: boolean;
};

export type AppTestAccessablityConditionTest = {
  type: 'test';
  testId: string;
  data: AppTestAccessablityConditionTestScore | AppTestAccessablityConditionTestSuccedded;
};

export type AppTestAccessablityConditionArticle = {
  type: 'article';
  articleId: string;
  isReaded?: NullableValue<boolean>;
};

export type AppTestVm = Omit<
  TestOut,
  | 'questions'
  | 'accessabilityConditions'
  | 'order'
  | 'parentId'
  | 'minScore'
  | 'maxErrors'
  | 'showCorrectAnswer'
  | 'includeToStatistics'
  | 'showSkipButton'
  | 'showNavigation'
  | 'showBackButton'
  | 'hidden'
  | 'randomizeQuestions'
  | 'questionsToShow'
> & {
  order?: NullableValue<number>;
  parentId?: NullableValue<string>;
  minScore?: NullableValue<number>;
  maxErrors?: NullableValue<number>;
  showCorrectAnswer?: NullableValue<boolean>;
  includeToStatistics?: NullableValue<boolean>;
  showSkipButton?: NullableValue<boolean>;
  showNavigation?: NullableValue<boolean>;
  showBackButton?: NullableValue<boolean>;
  hidden?: NullableValue<boolean>;
  randomizeQuestions?: NullableValue<boolean>;
  questionsToShow?: NullableValue<number>;
  questions?: NullableValue<AppTestQuestionVm[]>;
  accessabilityConditions?: NullableValue<AppTestAccessablityCondition[]>;
};

export enum RescueParameterSeverityEnum {
  Normal = 'normal',
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}

export type RescueParameterSeverityVm = {
  min?: number;
  max?: number;
  severity?: RescueParameterSeverityEnum;
  description?: string;
};

export type RescueTimerParameterVm = {
  id: string;
  name: string;
  delta: number;
  startValue: number;
  severities?: RescueParameterSeverityVm[];
  type?: 'numeric' | 'timer';
  isHidden?: boolean;
};

export type RescueChoiceParameterChangeVm = {
  parameterId: string;
  value: number;
};

export type RescueScheneChoiceImplicationVm = {
  description: string;
  severity: RescueParameterSeverityEnum;
};

export type RescueSceneChoiceVm = {
  id: string;
  text: string;
  parameterChanges: RescueChoiceParameterChangeVm[];
  nextSceneId: NullableValue<string>;
  implications?: NullableValue<RescueScheneChoiceImplicationVm[]>;
};

export type RescueSceneVm = {
  id: string;
  order?: number;
  background?: string;
  text: string;
  choices: RescueSceneChoiceVm[];
  hidden?: NullableValue<boolean>;
  isReviewed?: NullableValue<boolean>;
};

export enum RescueCompletionLogicalOperator {
  And = 'and',
  Or = 'or'
}

export enum RescueCompletionCompareOperator {
  Eq = 'eq',
  Neq = 'neq',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte'
}

export type RescueCompletionCompareVm = {
  type: 'compare';
  parameterId: string;
  operator: RescueCompletionCompareOperator;
  value: number;
};

export type RescueCompletionGroupVm = {
  type: 'group';
  logicalOperator: RescueCompletionLogicalOperator;
  conditions: RescueCompletionConditionVm[];
};

export type RescueCompletionConditionVm = RescueCompletionCompareVm | RescueCompletionGroupVm;

export type AppRescueItemCompletionVm = {
  success?: NullableValue<RescueCompletionConditionVm>;
  failure?: NullableValue<RescueCompletionConditionVm>;
};

export type AppRescueItemDataVm = {
  parameters?: RescueTimerParameterVm[];
  scenes?: RescueSceneVm[];
  defaultBackground?: string;
  completion?: AppRescueItemCompletionVm;
};

export type AppRescueItemVm = Omit<RescueOut, 'data' | 'order' | 'parentId' | 'description'> & {
  order?: NullableValue<number>;
  parentId?: NullableValue<string>;
  description?: string;
  data: AppRescueItemDataVm;
};

export type AppUserVm = UserOut;

export type {
  ArticleOut,
  FolderOut,
  RescueOut,
  TestOut,
  LinkToArticle,
  UserOut,
  Token,
  TariffOut,
  TariffCreate,
  TariffUpdate,
} from '@/core/api/generated/types.gen';
