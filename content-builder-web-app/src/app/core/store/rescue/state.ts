import { AppRescueItemVm, generateGUID, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RescueActions } from './actions';
import { AppRescueStorageService } from '@/core/api';
import { append, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { uniqBy } from 'lodash';

type RescueStateModel = {
  rescueItems?: AppRescueItemVm[];
};

@Injectable()
@State<RescueStateModel>({
  name: 'rescue',
  defaults: {}
})
export class RescueState {
  private readonly _rescueStorage = inject(AppRescueStorageService);

  @Selector()
  public static getAllRescueItems(state: RescueStateModel) {
    return [...state.rescueItems ?? []].map(x => ({ ...x }));
  }

  @Selector()
  public static getRescueItems(state: RescueStateModel) {
    return (parentId: NullableValue<string>) => [...state.rescueItems?.filter(x => x.parentId == parentId) ?? []].map(x => ({ ...x }));
  }

  @Action(RescueActions.FetchRescueItems, { cancelUncompleted: true })
  private _fetchRescueItems(ctx: StateContext<RescueStateModel>, { parentId }: RescueActions.FetchRescueItems) {
    const { rescueItems } = ctx.getState();
    if (rescueItems?.some(x => x.parentId === (parentId ?? null))) {
      return;
    }
    return this._rescueStorage.fetchRescueItems(parentId)
      .pipe(tap((r) => {
        ctx.setState(patch({
          rescueItems: append(r)
        }));
      }));
  }

  @Action(RescueActions.CreateRescueItem, { cancelUncompleted: true })
  private _createRescueItem(ctx: StateContext<RescueStateModel>, { payload }: RescueActions.CreateRescueItem) {
    const id = payload.id ?? generateGUID();
    const newRescueItem = {
      ...payload,
      id
    } as AppRescueItemVm;
    return this._rescueStorage.createRescueItem(newRescueItem)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueItems: append([newRescueItem])
        }));
      }));
  }

  @Action(RescueActions.UpdateRescueItem)
  private _updateRescueItem(ctx: StateContext<RescueStateModel>, { rescueItemId, payload }: RescueActions.UpdateRescueItem) {
    return this._rescueStorage.updateRescueItem({ id: rescueItemId, ...payload } as AppRescueItemVm)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueItems: updateItem(x => x.id === rescueItemId, x => ({ ...x, ...payload }))
        }));
      }));
  }

  @Action(RescueActions.DeleteRescueItem, { cancelUncompleted: true })
  private _deleteRescueItem(ctx: StateContext<RescueStateModel>, { rescueItemId }: RescueActions.DeleteRescueItem) {
    return this._rescueStorage.deleteRescueItem(rescueItemId)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueItems: removeItem(x => x.id === rescueItemId)
        }));
      }));
  }

  @Action(RescueActions.FetchAllRescueItems, { cancelUncompleted: true })
  private _fetchAllRescueItems(ctx: StateContext<RescueStateModel>) {
    return this._rescueStorage.fetchAllRescueItems()
      .pipe(tap((r) => {
        const { rescueItems } = ctx.getState();
        ctx.setState(patch({
          rescueItems: uniqBy<AppRescueItemVm>([...(rescueItems ?? []), ...r], x => x.id)
        }));
      }));
  };
}
