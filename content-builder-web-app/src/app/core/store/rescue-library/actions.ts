import { RescueLibraryItemVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RescueLibraryActions {
  export class FetchRescueLibraryItems {
    public static readonly type = '[RescueLibrary] FetchRescueLibraryItems';

    constructor(public readonly parentId: NullableValue<string>) {}
  }

  export class UpdateRescueLibraryItem {
    public static readonly type = '[RescueLibrary] UpdateRescueLibraryItem';
    constructor(public readonly rescueLibraryItemId: string, public readonly payload: Partial<RescueLibraryItemVm>) {}
  }

  export class CreateRescueLibraryItem {
    public static readonly type = '[RescueLibrary] CreateRescueLibraryItem';
    constructor(public readonly payload: RescueLibraryItemVm) {}
  }

  export class FetchAllRescueLibraryItems {
    public static readonly type = '[RescueLibrary] FetchAllRescueLibraryItems';
  }

  export class DeleteRescueLibraryItem {
    public static readonly type = '[RescueLibrary] DeleteRescueLibraryItem';
    constructor(public readonly rescueLibraryItemId: string) {}
  }
}
