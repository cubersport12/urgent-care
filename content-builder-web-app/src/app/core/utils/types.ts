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

/** Общий параметр, изменяемый по  таймеру */
export type RescueTimerParameterVm = {
  /* ИД */
  id: string;
  /* Наименование параметра */
  name: string;
  /* Насколько указанный параметр будет изменен */
  delta: number;
  /* Стартовое значение параметра на старте */
  startValue: number;
  /* Уровни серьезности параметра */
  severities?: RescueParameterSeverityVm[];
};

/** На какой параметр воздействовать после выбора ответа на вопрос */
export type RescueChoiceParameterChangeVm = {
  /* ИД параметра */
  parameterId: string;
  /* Насколько изменить указанный параметр */
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
  hidden?: NullableValue<boolean>;
  /** Была ли сцена проверена на наличие ошибок */
  isReviewed?: NullableValue<boolean>;
};

// --- Условия завершения режима спасения (успех / неуспех) ---

/** Логическое объединение вложенных условий в группе */
export enum RescueCompletionLogicalOperator {
  And = 'and',
  Or = 'or'
}

/** Операция сравнения текущего числового значения параметра с константой */
export enum RescueCompletionCompareOperator {
  Eq = 'eq',
  Neq = 'neq',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte'
}

/**
 * Лист дерева условий: одно сравнение значения параметра (id из {@link RescueTimerParameterVm}).
 * Пример: параметр «1» больше 5 — `{ type: 'compare', parameterId: '1', operator: Gt, value: 5 }`.
 */
export type RescueCompletionCompareVm = {
  type: 'compare';
  parameterId: string;
  operator: RescueCompletionCompareOperator;
  value: number;
};

/**
 * Группа условий, объединённых по И/ИЛИ.
 * Пример успеха: (пар.1 > 5 и пар.1 < 50) и (пар.2 < 100 и пар.2 > 50) и (пар.3 = 30)
 * — корневая группа `And` с тремя дочерними элементами: две вложенные `And` по двум compare и один compare.
 */
export type RescueCompletionGroupVm = {
  type: 'group';
  logicalOperator: RescueCompletionLogicalOperator;
  conditions: RescueCompletionConditionVm[];
};

/** Условие завершения: сравнение или вложенная логическая группа */
export type RescueCompletionConditionVm = RescueCompletionCompareVm | RescueCompletionGroupVm;

/**
 * Модель завершения режима спасения: отдельные деревья условий для успешного и неуспешного исхода.
 * Семантику приоритета (что проверять первым, могут ли совпасть оба) задаёт приложение / рантайм.
 */
export type AppRescueItemCompletionVm = {
  /** Дерево условий успешного завершения */
  success?: NullableValue<RescueCompletionConditionVm>;
  /** Дерево условий неуспешного завершения (та же структура, что и у success) */
  failure?: NullableValue<RescueCompletionConditionVm>;
};

export type AppRescueItemDataVm = {
  /** Общие параметры по таймеру */
  parameters?: RescueTimerParameterVm[];
  /** Сцены визуальной новеллы */
  scenes?: RescueSceneVm[];
  /** URL или id фона по умолчанию */
  defaultBackground?: string;
  /** Условия успешного и неуспешного завершения режима */
  completion?: AppRescueItemCompletionVm;
};

export type AppRescueItemVm = {
  createdAt: string;
  description: string;
  data: AppRescueItemDataVm;
} & AppBaseVm;

export type RescueParameterSeverityVm = {
  min?: number;
  max?: number;
  severity?: RescueParameterSeverityEnum;
  description?: string;
};

export enum RescueParameterSeverityEnum {
  Normal = 'normal',
  Low = 'low',
  Medium = 'medium',
  High = 'high'
}
