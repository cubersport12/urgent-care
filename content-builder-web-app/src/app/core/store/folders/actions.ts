import { AppFolderVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace FoldersActions {
  export class CreateFolder {
    static readonly type = '[Folders] Add Folder';

    constructor(public readonly parentId: NullableValue<string>, public readonly payload: Partial<Omit<AppFolderVm, 'parentId'>>) {}
  }

  export class UpdateFolder {
    static readonly type = '[Folders] Update Folder';

    constructor(public readonly folderId: string, public readonly payload: Partial<AppFolderVm>) {}
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
