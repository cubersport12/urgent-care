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
  
} & AppBaseVm;
