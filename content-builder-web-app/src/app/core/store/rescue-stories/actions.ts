import { RescueStoryVm, NullableValue } from '@/core/utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RescueStoriesActions {
  export class FetchRescueStories {
    public static readonly type = '[RescueStories] FetchRescueStories';

    constructor(public readonly rescueId: NullableValue<string>) {}
  }

  export class UpdateRescueStory {
    public static readonly type = '[RescueStories] UpdateRescueStory';
    constructor(public readonly rescueStoryId: string, public readonly payload: Partial<RescueStoryVm>) {}
  }

  export class CreateRescueStory {
    public static readonly type = '[RescueStories] CreateRescueStory';
    constructor(public readonly payload: RescueStoryVm) {}
  }

  export class FetchAllRescueStories {
    public static readonly type = '[RescueStories] FetchAllRescueStories';
  }

  export class DeleteRescueStory {
    public static readonly type = '[RescueStories] DeleteRescueStory';
    constructor(public readonly rescueStoryId: string) {}
  }
}
