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

// Режим спаасения
export type AppRescueItemVm = {
  createdAt: string;
  description: string;
  data: AppRescueItemDataVm;
} & AppBaseVm;

export type AppRescueItemDataVm = {
  parameters?: AppRescueItemParameterVm[];
};

export type AppRescueItemParameterVm = {
  id: string;
  label: string;
  value: string | number;
  category: 'number' | 'duration';
  discriminatorByTimer?: AppRescueItemParameterDiscriminatorByTimerVm;
};

export type AppRescueItemParameterDiscriminatorByTimerVm = {
  type: 'value' | 'range';
  min: number;
  max: number;
};

// Модель элемента справочника из режима спасения
// Это может быть как папка так и действие
export type RescueLibraryItemVm = (RescueLibraryFolderVm
  | RescueLibraryTestVm
  | RescueLibraryQuestionVm
  | RescueLibraryMedicineVm
  | RescueLibraryTriggerVm
  | RescueLibraryParamsStateVm
  | RescueLibraryFolderContainerVm) | RescueLibraryUnknownVm;

export type RescueLibraryFolderVm = {
  type: 'folder';
  description?: string;
} & AppBaseVm;

export type RescueLibraryTestVm = {
  type: 'test';
  data?: {
    testId: string;
  };
  description?: string;
} & AppBaseVm;

export type RescueLibraryQuestionVm = {
  type: 'question';
  data?: {
    question?: AppTestQuestionVm;
  };
  description?: string;
} & AppBaseVm;

export type RescueLibraryMedicineVm = {
  type: 'medicine';
  description?: string;
} & AppBaseVm;

// панель отображения состояния параметров
export type RescueLibraryParamsStateVm = {
  type: 'params-state';
  description?: string;
} & AppBaseVm;

// панель для отображения элементов выбранной папки на сцене
export type RescueLibraryFolderContainerVm = {
  type: 'folder-container';
  description?: string;
} & AppBaseVm;

export type RescueLibraryTriggerVm = {
  type: 'trigger';
  description?: string;
  data?: {
    buttonType: 'button' | 'toggle';
    onSvg?: string;
    offSvg?: string;
    rescueLibraryItemId?: string;
  };
} & AppBaseVm;

export type RescueLibraryUnknownVm = {
  type: 'unknown';
} & AppBaseVm;

export type RescueStoryVm = {
  rescueId: string;
  description?: string;
  createAt?: string;
  data: RescueStoryDataVm;
} & Omit<AppBaseVm, 'parentId'>;

export type RescueStoryDataVm = {
  scene: RescueStorySceneVm;
};

export type RescueStorySceneVm = {
  backgroundImage: string;
  // элементы сцены перенесенные из библиотеки
  items: RescueStorySceneTriggerVm[];
  // ограничения, по которым сцена будет меняться на следующую
  restritions: RescueStorySceneRestrictionsVm[];
};

export type RescueStorySceneRestrictionsVm = {
  params: RescueStorySceneRestrictionParamVm[];
};

export type RescueStorySceneRestrictionParamVm = {
  id: AppRescueItemParameterVm['id'];
  value: AppRescueItemParameterVm['value'];
};

export type RescueStorySceneTriggerVm = {
  triggerId: string;
  position: Record<'x' | 'y', number>;
  size: Record<'width' | 'height', number>;
  parameters: RescueStorySceneTriggerParamVm[];
  visibleParams: RescueStorySceneTriggerParamVm[];
};

export type RescueStorySceneTriggerParamVm = {
  id: AppRescueItemParameterVm['id'];
  value: AppRescueItemParameterVm['value'];
};
