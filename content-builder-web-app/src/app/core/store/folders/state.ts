import { AppFolderVm, generateGUID, NullableValue } from '@/core/utils';
import { inject, Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { FoldersActions } from './actions';
import { AppFoldersStorageService } from '@/core/api';
import { tap } from 'rxjs';
import { patch } from '@ngxs/store/operators';

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
    const newId = action.payload.id ?? generateGUID();
    const newFolder = { ...payload, id: newId, parentId: parentId ?? null } as AppFolderVm;
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

  @Action(FoldersActions.DeleteFolder, { cancelUncompleted: true })
  private _deleteFolder(ctx: StateContext<FoldersStateModel>, action: FoldersActions.DeleteFolder) {
    const { folderId } = action;
    return this._foldersStorage.deleteFolder(folderId)
      .pipe(tap(() => {
        const state = ctx.getState();
        const { folders } = state;
        const allFolders = this._getAllFolder(state);
        const pId = getNullableId(allFolders.find(x => x.id === folderId)?.parentId);
        ctx.setState(patch({
          folders: {
            ...folders,
            [pId]: folders[pId].filter(f => f.id !== folderId)
          }
        }));
      }));
  }

  private _getAllFolder(model: FoldersStateModel) {
    return Object.values(model.folders).flat();
  }

  @Action(FoldersActions.UpdateFolder)
  private _updateFolder(ctx: StateContext<FoldersStateModel>, action: FoldersActions.UpdateFolder) {
    const state = ctx.getState();
    const { folderId, payload } = action;
    const allFolders = this._getAllFolder(state);
    const found = allFolders.find(f => f.id === folderId);
    if (found == null) {
      throw new Error('Folder not found');
    }
    const newFolder = {
      ...found,
      ...payload
    } as AppFolderVm;
    return this._foldersStorage.updateFolder(newFolder)
      .pipe(tap(() => {
        const { folders } = ctx.getState();
        const pId = getNullableId(newFolder.parentId);
        ctx.setState(patch({
          folders: {
            ...folders,
            [pId]: folders[pId].map(f => f.id === folderId ? newFolder : f)
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
