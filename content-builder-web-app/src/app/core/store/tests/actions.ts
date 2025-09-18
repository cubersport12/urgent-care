import { AppTestVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TestsActions {
  export class FetchTests {
    public static readonly type = '[Tests] FetchTests';

    constructor(public readonly parentId: NullableValue<string>) {}
  }

  export class UpdateTest {
    public static readonly type = '[Tests] UpdateTest';
    constructor(public readonly testId: string, public readonly payload: Partial<AppTestVm>) {}
  }

  export class CreateTest {
    public static readonly type = '[Tests] CreateTest';
    constructor(public readonly payload: AppTestVm) {}
  }

  export class FetchAllTests {
    public static readonly type = '[Tests] FetchAllTests';
  }

  export class DeleteTest {
    public static readonly type = '[Tests] DeleteTest';
    constructor(public readonly testId: string) {}
  }
}
