export type NullableValue<T> = T | null | undefined;

export type AppFolderVm = {
  id: string;
  name: string;
  parentId?: NullableValue<string>;
};
