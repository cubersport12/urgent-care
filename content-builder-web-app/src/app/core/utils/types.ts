export type NullableValue<T> = T | null | undefined;

export type AppIdentity = {
  id: string;
};
export type AppBaseVm = { name: string; order?: number; parentId: NullableValue<string> } & AppIdentity;

export type AppFolderVm = {
} & AppBaseVm;

export type AppLinkToArticleVm = {
  key: string;
  articleId: string;
};

export type AppArticleVm = {
  nextRunArticle?: NullableValue<string>;
  timeRead?: NullableValue<number>;
  disableWhileNotPrevComplete?: NullableValue<boolean>;
  hideWhileNotPrevComplete?: NullableValue<boolean>;
  includeToStatistics?: NullableValue<boolean>;
  linksToArticles: NullableValue<AppLinkToArticleVm[]>;
} & AppBaseVm;

export type AppTestVm = {
  accessabilityConditions?: NullableValue<AppTestAccessablityCondition[]>;
  questions?: NullableValue<AppTestQuestionVm[]>;
  minScore?: NullableValue<number>;
  maxErrors?: NullableValue<number>;
  showCorrectAnswer?: NullableValue<boolean>;
  includeToStatistics?: NullableValue<boolean>;
  showSkipButton?: NullableValue<boolean>;
  showNavigation?: NullableValue<boolean>;
  showBackButton?: NullableValue<boolean>;
  hidden?: NullableValue<boolean>;
} & AppBaseVm;

export type AppTestQuestionVm = {
  questionText: string;
  image?: NullableValue<string>;
  answers: NullableValue<AppTestQuestionAnswerVm[]>;
  activationCondition?: AppTestQuestionActivationCondition;
} & AppBaseVm;
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

export enum AppTestAccessablityLogicalOperator {
  And = 'and',
  Or = 'or'
}

export type AppTestAccessablityCondition = {
  logicalOperator?: AppTestAccessablityLogicalOperator;
} & (AppTestAccessablityConditionTest | AppTestAccessablityConditionArticle);

export type AppTestAccessablityConditionTest = {
  type: 'test';
  testId: string;
  data: AppTestAccessablityConditionTestScore | AppTestAccessablityConditionTestSuccedded;
};

export type AppTestAccessablityConditionTestScore = {
  type: 'score';
  score: number;
};
export type AppTestAccessablityConditionTestSuccedded = {
  type: 'succedded';
  success: boolean;
};

export type AppTestAccessablityConditionArticle = {
  type: 'article';
  articleId: string;
  isReaded?: NullableValue<boolean>;
};

// Режим спасения (rescue) — визуальная новелла с параметрами по таймеру

/** Общий параметр, изменяемый по таймеру (delta за тик, startValue — начальное значение) */
export type RescueTimerParameterVm = {
  id: string;
  name: string;
  delta: number;
  startValue: number;
};

/** Изменение параметра при выборе варианта в сцене */
export type RescueChoiceParameterChangeVm = {
  parameterId: string;
  value: number;
};

/** Вариант выбора в сцене: текст, изменения параметров и следующая сцена */
export type RescueSceneChoiceVm = {
  id: string;
  text: string;
  parameterChanges: RescueChoiceParameterChangeVm[];
  /** id сцены, на которую переход при выборе; null — конец/без перехода */
  nextSceneId: NullableValue<string>;
};

/** Сцена: фон, текст и варианты выбора (визуальная новелла) */
export type RescueSceneVm = {
  id: string;
  order?: number;
  /** URL или id фона */
  background: string;
  text: string;
  choices: RescueSceneChoiceVm[];
};

export type AppRescueItemDataVm = {
  /** Общие параметры по таймеру */
  parameters?: RescueTimerParameterVm[];
  /** Сцены визуальной новеллы */
  scenes?: RescueSceneVm[];
};

export type AppRescueItemVm = {
  createdAt: string;
  description: string;
  data: AppRescueItemDataVm;
} & AppBaseVm;
