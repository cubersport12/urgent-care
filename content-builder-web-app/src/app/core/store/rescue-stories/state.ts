import { RescueStoryVm, generateGUID, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RescueStoriesActions } from './actions';
import { AppRescueStoriesStorageService } from '@/core/api';
import { append, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { uniqBy } from 'lodash';

type RescueStoriesStateModel = {
  rescueStories?: RescueStoryVm[];
};

@Injectable()
@State<RescueStoriesStateModel>({
  name: 'rescueStories',
  defaults: {}
})
export class RescueStoriesState {
  private readonly _rescueStoriesStorage = inject(AppRescueStoriesStorageService);

  @Selector()
  public static getAllRescueStories(state: RescueStoriesStateModel) {
    return [...state.rescueStories ?? []].map(x => ({ ...x }));
  }

  @Selector()
  public static getRescueStories(state: RescueStoriesStateModel) {
    return (rescueId: NullableValue<string>) => [...state.rescueStories?.filter(x => x.rescueId === rescueId) ?? []].map(x => ({ ...x }));
  }

  @Action(RescueStoriesActions.FetchRescueStories, { cancelUncompleted: true })
  private _fetchRescueStories(ctx: StateContext<RescueStoriesStateModel>, { rescueId }: RescueStoriesActions.FetchRescueStories) {
    return this._rescueStoriesStorage.fetchRescueStories(rescueId)
      .pipe(tap((r) => {
        const { rescueStories } = ctx.getState();
        // Удаляем старые истории для этого rescueId и добавляем новые
        const filtered = rescueStories?.filter(x => x.rescueId !== rescueId) ?? [];
        ctx.setState(patch({
          rescueStories: [...filtered, ...r]
        }));
      }));
  }

  @Action(RescueStoriesActions.CreateRescueStory, { cancelUncompleted: true })
  private _createRescueStory(ctx: StateContext<RescueStoriesStateModel>, { payload }: RescueStoriesActions.CreateRescueStory) {
    const id = payload.id ?? generateGUID();
    const newRescueStory = {
      ...payload,
      id
    } as RescueStoryVm;
    return this._rescueStoriesStorage.createRescueStory(newRescueStory)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueStories: append([newRescueStory])
        }));
      }));
  }

  @Action(RescueStoriesActions.UpdateRescueStory)
  private _updateRescueStory(ctx: StateContext<RescueStoriesStateModel>, { rescueStoryId, payload }: RescueStoriesActions.UpdateRescueStory) {
    return this._rescueStoriesStorage.updateRescueStory({ id: rescueStoryId, ...payload } as RescueStoryVm)
      .pipe(tap(() => {
        ctx.setState(patch({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rescueStories: updateItem(x => x.id === rescueStoryId, x => ({ ...x, ...payload as any }))
        }));
      }));
  }

  @Action(RescueStoriesActions.DeleteRescueStory, { cancelUncompleted: true })
  private _deleteRescueStory(ctx: StateContext<RescueStoriesStateModel>, { rescueStoryId }: RescueStoriesActions.DeleteRescueStory) {
    return this._rescueStoriesStorage.deleteRescueStory(rescueStoryId)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueStories: removeItem(x => x.id === rescueStoryId)
        }));
      }));
  }

  @Action(RescueStoriesActions.FetchAllRescueStories, { cancelUncompleted: true })
  private _fetchAllRescueStories(ctx: StateContext<RescueStoriesStateModel>) {
    return this._rescueStoriesStorage.fetchAllRescueStories()
      .pipe(tap((r) => {
        const { rescueStories } = ctx.getState();
        ctx.setState(patch({
          rescueStories: uniqBy<RescueStoryVm>([...(rescueStories ?? []), ...r], x => x.id)
        }));
      }));
  };
}
