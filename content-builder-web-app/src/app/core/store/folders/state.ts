import { AppFolderVm, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { FoldersActions } from './actions';
import { AppFoldersStorageService } from '@/core/api';
import { tap } from 'rxjs';
import { patch } from '@ngxs/store/operators';
import uniqid from 'uniqid';

const getNullableId = (id: NullableValue<string>) => id ?? '';

type FoldersStateModel = {
  folders: Record<string, AppFolderVm[]>;
};

@Injectable()
@State<FoldersStateModel>({
  name: 'folders',
  defaults: {
    folders: {}
  }
})
export class FoldersState {
  private readonly _foldersStorage = inject(AppFoldersStorageService);

  @Selector()
  public static getFolders(state: FoldersStateModel) {
    return (parentId: NullableValue<string>) => state.folders[getNullableId(parentId)];
  }

  @Action(FoldersActions.CreateFolder, { cancelUncompleted: true })
  private _createFolder(ctx: StateContext<FoldersStateModel>, action: FoldersActions.CreateFolder) {
    const { parentId, payload } = action;
    const newId = uniqid();
    const newFolder: AppFolderVm = { ...payload, id: newId, parentId: parentId ?? null };
    return this._foldersStorage.createFolder(newFolder)
      .pipe(tap(() => {
        const { folders } = ctx.getState();
        const pId = getNullableId(parentId);
        ctx.setState(patch({
          folders: {
            ...folders,
            [pId]: [...(folders[pId] ?? []), newFolder]
          }
        }));
      }));
  }

  @Action(FoldersActions.FetchFolders, { cancelUncompleted: true })
  private _fetchFolders(ctx: StateContext<FoldersStateModel>, action: FoldersActions.FetchFolders) {
    const { folders } = ctx.getState();
    const parentId = getNullableId(action.parentId);
    if (folders[parentId] != null) {
      return;
    }
    return this._foldersStorage.fetchFolders(action.parentId ?? null)
      .pipe(tap((f) => {
        ctx.setState(patch({ folders: { ...folders, [parentId]: f } }));
      }));
  }
}
