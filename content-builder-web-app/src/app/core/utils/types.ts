export type NullableValue<T> = T | null | undefined;

export type AppIdentity = {
  id: string;
};
export type AppBaseVm = { name: string } & AppIdentity;

export type AppFolderVm = {
  parentId?: NullableValue<string>;
} & AppBaseVm;

export type AppArticleVm = {
  parentId?: NullableValue<string>;
  nextRunArticle?: NullableValue<string>;
  timeRead?: NullableValue<number>;
  disableWhileNotPrevComplete?: NullableValue<boolean>;
  hideWhileNotPrevComplete?: NullableValue<boolean>;
  includeToStatistics?: NullableValue<boolean>;
} & AppBaseVm;
