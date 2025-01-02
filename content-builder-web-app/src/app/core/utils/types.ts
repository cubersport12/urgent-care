export type NullableValue<T> = T | null | undefined;

export type AppIdentity = {
  id: string;
};
export type AppBaseVm = { name: string } & AppIdentity;

export type AppFolderVm = {
  parentId?: NullableValue<string>;
} & AppBaseVm;

export type AppArticleVm = {
  htmlContent: string;
  parentId?: NullableValue<string>;
} & AppBaseVm;
