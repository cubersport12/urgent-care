/**
 * App view-models: API DTOs from OpenAPI codegen + local domain shapes for JSONB blobs.
 */
import type {
  ArticleOut,
  ArticleStatsOut,
  FolderMaterialCountOut,
  FolderOut,
  LinkToArticle,
  RescueOut,
  RescueStatsOut,
  TestOut,
  TestResultOut,
  TestStatsOut,
  UserOut,
} from '@/api/generated/types.gen';

export type NullableValue<T> = T | null | undefined;

export type AppIdentity = { id: string };
export type AppBaseVm = {
  name: string;
  order?: number | null;
  parentId: NullableValue<string>;
} & AppIdentity;

/** @deprecated prefer FolderOut from OpenAPI */
export type AppFolderVm = FolderOut;

export type AppFolderMaterialCountVm = FolderMaterialCountOut;

export type AppLinkToArticleVm = LinkToArticle;

export type AppArticleVm = ArticleOut;

export type AppTestQuestionAnswerVm = {
  answerText: string;
  image?: NullableValue<string>;
  score?: number;
  isCorrect?: boolean;
};

export enum AppTestQuestionActivationConditionKind {
  CompleteQuestion = 'CompleteQuestion',
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
  Or = 'or',
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

export type AppTestVm = Omit<TestOut, 'questions' | 'accessabilityConditions'> & {
  questions?: NullableValue<AppTestQuestionVm[]>;
  accessabilityConditions?: NullableValue<AppTestAccessablityCondition[]>;
};

export enum RescueParameterSeverityEnum {
  Normal = 'normal',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
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
  Or = 'or',
}

export enum RescueCompletionCompareOperator {
  Eq = 'eq',
  Neq = 'neq',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte',
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

export type AppRescueItemVm = Omit<RescueOut, 'data'> & {
  data: AppRescueItemDataVm;
};

export type AppArticleStatsVm = ArticleStatsOut;
export type AppTestStatsVm = TestStatsOut;
export type AppRescueStatsVm = RescueStatsOut;
export type AppTestResultVm = TestResultOut;
export type AppUserVm = UserOut;

export type {
  ArticleOut,
  FolderOut,
  RescueOut,
  TestOut,
  ArticleStatsOut,
  TestStatsOut,
  RescueStatsOut,
  TestResultOut,
  UserOut,
  Token,
  LinkToArticle,
} from '@/api/generated/types.gen';
