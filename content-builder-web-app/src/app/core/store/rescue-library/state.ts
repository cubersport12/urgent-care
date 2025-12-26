import { RescueLibraryItemVm, generateGUID, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { RescueLibraryActions } from './actions';
import { AppRescueLibraryStorageService } from '@/core/api';
import { append, patch, removeItem, updateItem } from '@ngxs/store/operators';
import { tap } from 'rxjs';
import { uniqBy } from 'lodash';

type RescueLibraryStateModel = {
  rescueLibraryItems?: RescueLibraryItemVm[];
};

@Injectable()
@State<RescueLibraryStateModel>({
  name: 'rescueLibrary',
  defaults: {}
})
export class RescueLibraryState {
  private readonly _rescueLibraryStorage = inject(AppRescueLibraryStorageService);

  @Selector()
  public static getAllRescueLibraryItems(state: RescueLibraryStateModel) {
    return [...state.rescueLibraryItems ?? []].map(x => ({ ...x }));
  }

  @Selector()
  public static getRescueLibraryItems(state: RescueLibraryStateModel) {
    return (parentId: NullableValue<string>) => [...state.rescueLibraryItems?.filter(x => x.parentId == parentId) ?? []].map(x => ({ ...x }));
  }

  @Action(RescueLibraryActions.FetchRescueLibraryItems, { cancelUncompleted: true })
  private _fetchRescueLibraryItems(ctx: StateContext<RescueLibraryStateModel>, { parentId }: RescueLibraryActions.FetchRescueLibraryItems) {
    const { rescueLibraryItems } = ctx.getState();
    if (rescueLibraryItems?.some(x => x.parentId === (parentId ?? null))) {
      return;
    }
    return this._rescueLibraryStorage.fetchRescueLibraryItems(parentId)
      .pipe(tap((r) => {
        ctx.setState(patch({
          rescueLibraryItems: append(r)
        }));
      }));
  }

  @Action(RescueLibraryActions.CreateRescueLibraryItem, { cancelUncompleted: true })
  private _createRescueLibraryItem(ctx: StateContext<RescueLibraryStateModel>, { payload }: RescueLibraryActions.CreateRescueLibraryItem) {
    const id = payload.id ?? generateGUID();
    const newRescueLibraryItem = {
      ...payload,
      id
    } as RescueLibraryItemVm;
    return this._rescueLibraryStorage.createRescueLibraryItem(newRescueLibraryItem)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueLibraryItems: append([newRescueLibraryItem])
        }));
      }));
  }

  @Action(RescueLibraryActions.UpdateRescueLibraryItem)
  private _updateRescueLibraryItem(ctx: StateContext<RescueLibraryStateModel>, { rescueLibraryItemId, payload }: RescueLibraryActions.UpdateRescueLibraryItem) {
    return this._rescueLibraryStorage.updateRescueLibraryItem({ id: rescueLibraryItemId, ...payload } as RescueLibraryItemVm)
      .pipe(tap(() => {
        ctx.setState(patch({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rescueLibraryItems: updateItem(x => x.id === rescueLibraryItemId, x => ({ ...x, ...payload as any }))
        }));
      }));
  }

  @Action(RescueLibraryActions.DeleteRescueLibraryItem, { cancelUncompleted: true })
  private _deleteRescueLibraryItem(ctx: StateContext<RescueLibraryStateModel>, { rescueLibraryItemId }: RescueLibraryActions.DeleteRescueLibraryItem) {
    return this._rescueLibraryStorage.deleteRescueLibraryItem(rescueLibraryItemId)
      .pipe(tap(() => {
        ctx.setState(patch({
          rescueLibraryItems: removeItem(x => x.id === rescueLibraryItemId)
        }));
      }));
  }

  @Action(RescueLibraryActions.FetchAllRescueLibraryItems, { cancelUncompleted: true })
  private _fetchAllRescueLibraryItems(ctx: StateContext<RescueLibraryStateModel>) {
    return this._rescueLibraryStorage.fetchAllRescueLibraryItems()
      .pipe(tap((r) => {
        const { rescueLibraryItems } = ctx.getState();
        ctx.setState(patch({
          rescueLibraryItems: uniqBy<RescueLibraryItemVm>([...(rescueLibraryItems ?? []), ...r], x => x.id)
        }));
      }));
  };
}
