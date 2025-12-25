import { AppRescueItemVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RescueActions {
  export class FetchRescueItems {
    public static readonly type = '[Rescue] FetchRescueItems';

    constructor(public readonly parentId: NullableValue<string>) {}
  }

  export class UpdateRescueItem {
    public static readonly type = '[Rescue] UpdateRescueItem';
    constructor(public readonly rescueItemId: string, public readonly payload: Partial<AppRescueItemVm>) {}
  }

  export class CreateRescueItem {
    public static readonly type = '[Rescue] CreateRescueItem';
    constructor(public readonly payload: AppRescueItemVm) {}
  }

  export class FetchAllRescueItems {
    public static readonly type = '[Rescue] FetchAllRescueItems';
  }

  export class DeleteRescueItem {
    public static readonly type = '[Rescue] DeleteRescueItem';
    constructor(public readonly rescueItemId: string) {}
  }
}
