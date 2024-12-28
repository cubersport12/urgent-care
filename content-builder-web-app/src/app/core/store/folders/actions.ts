import { AppFolderVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FoldersActions {
  export class CreateFolder {
    static readonly type = '[Folders] Add Folder';

    constructor(public readonly parentId: NullableValue<string>, public readonly payload: Omit<AppFolderVm, 'parentId' | 'id'>) {}
  }

  export class DeleteFolder {
    static readonly type = '[Folders] Delete Folder';

    constructor(public readonly folderId: string) {}
  }

  export class FetchFolders {
    static readonly type = '[Folders] Fetch Folders';

    constructor(public readonly parentId: NullableValue<string>) {}
  }
}
